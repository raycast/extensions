import { ScoredTask, DecisionGuide, FocusSession } from '../types/priority.types';
import { PriorityModel } from './priority.model';
import { TaskAggregator } from './task-aggregator';
import { UserPreferences } from '../types/preferences';

export class RecommendationEngine {
  private priorityModel: PriorityModel;
  private taskAggregator: TaskAggregator;

  constructor(preferences: UserPreferences) {
    this.priorityModel = new PriorityModel();
    this.taskAggregator = new TaskAggregator(preferences);
  }

  async generateDecisionGuide(): Promise<DecisionGuide> {
    const rawTasks = await this.taskAggregator.collectAllTasks();
    const scoredTasks = rawTasks.map((task) => this.priorityModel.scoreTask(task));

    // Sort by score (highest first)
    scoredTasks.sort((a, b) => b.score - a.score);

    const topTasks = scoredTasks.slice(0, 5); // Top 5 recommendations
    const criticalTasks = scoredTasks.filter((task) => task.priorityLevel === 'CRITICAL');
    const highPriorityTasks = scoredTasks.filter((task) => task.priorityLevel === 'HIGH');

    const totalEstimatedTime = scoredTasks.reduce(
      (sum, task) => sum + (task.estimatedTime || 0),
      0
    );
    return {
      timestamp: new Date(),
      topRecommendations: topTasks,
      criticalCount: criticalTasks.length,
      highPriorityCount: highPriorityTasks.length,
      totalTasks: scoredTasks.length,
      estimatedTotalTime: totalEstimatedTime,
      focusRecommendation: this.generateFocusRecommendation(scoredTasks),
      timeBreakdown: this.generateTimeBreakdown(scoredTasks),
      nextActions: this.generateNextActions(topTasks),
      availableSources: this.taskAggregator.getAvailableSources(),
    };
  }

  async startFocusSession(duration: number, focusArea?: string): Promise<FocusSession> {
    const decisionGuide = await this.generateDecisionGuide();

    return {
      id: `focus-${Date.now()}`,
      startTime: new Date(),
      plannedDuration: duration,
      focusArea: focusArea,
      recommendedTasks: decisionGuide.topRecommendations.slice(0, 3),
      distractionsBlocked: [],
      status: 'active',
    };
  }

  private calculateFocusTimeNeeded(tasks: ScoredTask[]): number {
    // Calculate time needed for critical and high priority tasks
    const urgentTasks = tasks.filter(
      (task) => task.priorityLevel === 'CRITICAL' || task.priorityLevel === 'HIGH'
    );

    const totalTime = urgentTasks.reduce((sum, task) => sum + (task.estimatedTime || 30), 0);

    // Add buffer time (20% for breaks, context switching, unexpected issues)
    return Math.round(totalTime * 1.2);
  }

  private generateFocusRecommendation(tasks: ScoredTask[]): string {
    const criticalCount = tasks.filter((t) => t.priorityLevel === 'CRITICAL').length;
    const highCount = tasks.filter((t) => t.priorityLevel === 'HIGH').length;

    if (criticalCount > 0) {
      return `Focus on ${criticalCount} critical item${criticalCount > 1 ? 's' : ''} first. These require immediate attention.`;
    }

    if (highCount >= 3) {
      return `You have ${highCount} high-priority items. Consider a focused 2-hour session to make progress on these.`;
    }

    if (highCount > 0) {
      return `Start with ${highCount} high-priority item${highCount > 1 ? 's' : ''}. You should be able to complete these today.`;
    }

    const mediumCount = tasks.filter((t) => t.priorityLevel === 'MEDIUM').length;
    if (mediumCount > 0) {
      return `Consider working on ${Math.min(3, mediumCount)} medium-priority items. Pace yourself and take breaks.`;
    }

    return 'You have a manageable workload today. Consider learning time or proactive work.';
  }

  private generateTimeBreakdown(tasks: ScoredTask[]): { [key: string]: number } {
    const breakdown: { [key: string]: number } = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      trivial: 0,
    };

    tasks.forEach((task) => {
      const time = task.estimatedTime || 30;
      switch (task.priorityLevel) {
        case 'CRITICAL':
          breakdown.critical += time;
          break;
        case 'HIGH':
          breakdown.high += time;
          break;
        case 'MEDIUM':
          breakdown.medium += time;
          break;
        case 'LOW':
          breakdown.low += time;
          break;
        case 'TRIVIAL':
          breakdown.trivial += time;
          break;
      }
    });

    return breakdown;
  }

  private generateNextActions(tasks: ScoredTask[]): string[] {
    const actions: string[] = [];

    if (tasks.length === 0) {
      actions.push('🎉 No urgent tasks! Consider learning or proactive work.');
      return actions;
    }

    const topTask = tasks[0];
    actions.push(`1. ${topTask.recommendedAction}`);
    actions.push(`   → ${topTask.title}`);

    if (tasks.length > 1) {
      const secondTask = tasks[1];
      actions.push(`2. Then tackle: ${secondTask.title}`);
    }

    if (tasks.length > 2) {
      actions.push(`3. After that, consider: ${tasks[2].title}`);
    }

    // Add time management advice
    const totalTime = tasks.slice(0, 3).reduce((sum, task) => sum + (task.estimatedTime || 30), 0);
    if (totalTime > 120) {
      actions.push('💡 Consider breaking work into 90-minute focused sessions with breaks.');
    }

    return actions;
  }
}
