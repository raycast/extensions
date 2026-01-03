import { RawTask, ScoredTask, PriorityLevel } from '../types/priority.types';

export class PriorityModel {
  private weights = {
    urgency: 0.3,
    importance: 0.25,
    effort: 0.2,
    dependencies: 0.15,
    context: 0.1,
  };

  scoreTask(
    task: RawTask,
    context?: {
      currentFocus?: string[];
      blockedTasks?: string[];
      timeOfDay?: number;
    }
  ): ScoredTask {
    const urgencyScore = this.calculateUrgency(task);
    const importanceScore = this.calculateImportance(task);
    const effortScore = this.calculateEffort(task);
    const dependencyScore = this.calculateDependencies(task, context?.blockedTasks);
    const contextScore = this.calculateContext(task, context);

    const totalScore =
      urgencyScore * this.weights.urgency +
      importanceScore * this.weights.importance +
      effortScore * this.weights.effort +
      dependencyScore * this.weights.dependencies +
      contextScore * this.weights.context;

    const priorityLevel = this.determinePriorityLevel(totalScore);

    return {
      ...task,
      score: Math.round(totalScore * 10) / 10, // Round to 1 decimal
      priorityLevel,
      factors: {
        urgency: urgencyScore,
        importance: importanceScore,
        effort: effortScore,
        dependencies: dependencyScore,
        context: contextScore,
      },
      recommendedAction: this.getRecommendedAction(priorityLevel),
      estimatedTime: this.estimateTime(task),
    };
  }

  private calculateUrgency(task: RawTask): number {
    let score = 5; // Base score

    // Age-based urgency (older tasks get more urgent)
    const ageInDays = (Date.now() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 14) score += 2;
    else if (ageInDays > 7) score += 1;
    else if (ageInDays < 1) score -= 1; // Very new tasks might need time to be properly triaged

    // Source-specific urgency
    switch (task.source) {
      case 'slack':
        score += 1; // Communications are often time-sensitive
        break;
      case 'linear':
        // Check Linear-specific metadata
        if (task.metadata?.stateType === 'started') score += 1;
        if (task.metadata?.linearPriority >= 3) score += 2; // High/Urgent priority
        break;
      case 'github': {
        // Check for urgent labels
        const urgentLabels = ['urgent', 'bug', 'critical', 'p0', 'p1'];
        const hasUrgentLabel = task.metadata?.labels?.some((label: string) =>
          urgentLabels.some((urgent) => label.toLowerCase().includes(urgent))
        );
        if (hasUrgentLabel) score += 2;
        break;
      }
    }

    return Math.max(1, Math.min(10, score));
  }

  private calculateImportance(task: RawTask): number {
    let score = 5; // Base score

    // Source-based importance
    switch (task.source) {
      case 'linear':
        // Linear issues in projects are generally more important
        if (task.metadata?.project) score += 1;
        break;
      case 'github':
        // PRs are generally more important than issues
        if (task.type === 'pull_request') score += 1;
        // Issues with many assignees are more important
        if (task.metadata?.assignees && task.metadata.assignees.length > 1) score += 1;
        break;
      case 'slack':
        // Mentions are more important than general DMs
        if (task.type === 'mention') score += 1;
        break;
    }

    return Math.max(1, Math.min(10, score));
  }

  private calculateEffort(task: RawTask): number {
    let score = 5; // Base score (inverse - lower effort = higher score)

    // Estimate-based effort
    if (task.metadata?.estimate) {
      const estimate = task.metadata.estimate;
      if (estimate <= 1)
        score += 2; // Quick wins
      else if (estimate <= 3)
        score += 1; // Small tasks
      else if (estimate > 8)
        score -= 2; // Large tasks
      else if (estimate > 5) score -= 1; // Medium-large tasks
    }

    // Type-based effort estimation
    switch (task.type) {
      case 'pull_request':
        score -= 1; // PRs often require review time
        break;
      case 'issue':
        // Complex issues might take longer
        if (task.description && task.description.length > 500) score -= 1;
        break;
      case 'mention':
      case 'direct_message':
        score += 1; // Communications are usually quick
        break;
    }

    return Math.max(1, Math.min(10, score));
  }

  private calculateDependencies(task: RawTask, blockedTasks?: string[]): number {
    let score = 5; // Base score

    // If this task is blocking others, increase priority
    if (blockedTasks?.includes(task.id)) {
      score += 3;
    }

    // Check for dependency indicators in title/description
    const dependencyKeywords = ['block', 'depend', 'wait', 'prerequisite', 'before'];
    const hasDependencyIndicator = dependencyKeywords.some((keyword) =>
      (task.title + ' ' + task.description).toLowerCase().includes(keyword)
    );

    if (hasDependencyIndicator) {
      score += 1;
    }

    return Math.max(1, Math.min(10, score));
  }

  private calculateContext(task: RawTask, context?: { currentFocus?: string[] }): number {
    let score = 5; // Base score

    if (!context?.currentFocus?.length) return score;

    // Check if task aligns with current focus areas
    const focusAreas = context.currentFocus;
    const taskText = (
      task.title +
      ' ' +
      task.description +
      ' ' +
      JSON.stringify(task.metadata)
    ).toLowerCase();

    const matchesFocus = focusAreas.some((focus) => taskText.includes(focus.toLowerCase()));

    if (matchesFocus) {
      score += 2;
    }

    return Math.max(1, Math.min(10, score));
  }

  private determinePriorityLevel(score: number): PriorityLevel {
    if (score >= 8.5) return PriorityLevel.CRITICAL;
    if (score >= 7.0) return PriorityLevel.HIGH;
    if (score >= 5.5) return PriorityLevel.MEDIUM;
    if (score >= 4.0) return PriorityLevel.LOW;
    return PriorityLevel.TRIVIAL;
  }

  private getRecommendedAction(priorityLevel: PriorityLevel): string {
    switch (priorityLevel) {
      case PriorityLevel.CRITICAL:
        return 'Address immediately - this is blocking progress';
      case PriorityLevel.HIGH:
        return 'Schedule for today - important for current goals';
      case PriorityLevel.MEDIUM:
        return 'Consider for today if time allows';
      case PriorityLevel.LOW:
        return 'Schedule for this week when capacity allows';
      case PriorityLevel.TRIVIAL:
        return 'Defer or delegate if possible';
      default:
        return 'Review and prioritize accordingly';
    }
  }

  private estimateTime(task: RawTask): number {
    // Base estimates in minutes
    const baseEstimates = {
      issue: 60,
      pull_request: 30,
      mention: 15,
      direct_message: 10,
    };

    let estimate = baseEstimates[task.type as keyof typeof baseEstimates] || 30;

    // Adjust based on metadata
    if (task.metadata?.estimate) {
      estimate = task.metadata.estimate * 60; // Convert hours to minutes
    }

    // Adjust based on description length (rough proxy for complexity)
    if (task.description) {
      const wordCount = task.description.split(' ').length;
      if (wordCount > 200) estimate *= 1.5;
      else if (wordCount < 50) estimate *= 0.7;
    }

    return Math.round(estimate);
  }
}
