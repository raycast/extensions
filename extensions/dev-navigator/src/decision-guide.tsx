import React, { useEffect, useState } from 'react';
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  useNavigation,
} from '@raycast/api';
import { RecommendationEngine } from './models/recommendation-engine';
import { DecisionGuide, ScoredTask } from './types/priority.types';
import { UserPreferences } from './types/preferences';

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getPriorityIcon(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return '🔴';
    case 'HIGH':
      return '🟠';
    case 'MEDIUM':
      return '🟡';
    case 'LOW':
      return '🟢';
    case 'TRIVIAL':
      return '⚪';
    default:
      return '⚪';
  }
}

function getSourceIcon(source: string): string {
  switch (source) {
    case 'github':
      return '🐙';
    case 'linear':
      return '📊';
    case 'slack':
      return '💬';
    default:
      return '📋';
  }
}

function TaskDetailView({ task }: { task: ScoredTask }) {
  const { pop } = useNavigation();
  const markdown = `# ${getPriorityIcon(task.priorityLevel)} ${task.title}

**Priority:** ${task.priorityLevel} (${task.score}/10)  
**Estimated:** ${formatTime(task.estimatedTime || 30)}  
**Source:** ${task.source}

${task.recommendedAction}

${task.description ? `> ${task.description}` : ''}

[${task.url}](${task.url})
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={task.url} />
          <Action.CopyToClipboard content={task.title} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function FocusSessionView({ task }: { task?: ScoredTask }) {
  const { pop } = useNavigation();
  if (!task) {
    return (
      <Detail
        markdown="# No task available\n\nThere are no recommendations to focus on right now."
        actions={
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `# 🎯 Focus Session

## ${getPriorityIcon(task.priorityLevel)} ${task.title}

**Priority:** ${task.priorityLevel} (${task.score}/10)  
**Estimated:** ${formatTime(task.estimatedTime || 30)}  
**Source:** ${task.source}

${task.recommendedAction}

${task.description ? `> ${task.description}` : ''}

[${task.url}](${task.url})
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={task.url} />
          <Action.CopyToClipboard content={task.title} />
          <Action title="End Session" icon={Icon.Stop} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function AllTasksView({ tasks }: { tasks: ScoredTask[] }) {
  if (tasks.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No tasks available"
          description="There are no recommendations to display right now."
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search tasks...">
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          subtitle={task.description ? task.description : task.recommendedAction}
          keywords={[task.priorityLevel, task.source, task.type]}
          accessories={[
            { text: getPriorityIcon(task.priorityLevel) },
            { text: formatTime(task.estimatedTime || 30) },
            { text: getSourceIcon(task.source) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" target={<TaskDetailView task={task} />} />
              <Action.OpenInBrowser url={task.url} />
              <Action.CopyToClipboard content={task.title} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function DecisionGuideCommand() {
  const [guide, setGuide] = useState<DecisionGuide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const preferences = getPreferenceValues<UserPreferences>();

  // Provide default values for preferences
  const defaultPreferences: UserPreferences = {
    ...preferences, // API tokens and other user-set preferences
    focusModeEnabled: preferences.focusModeEnabled ?? true,
    notificationBuffering: preferences.notificationBuffering ?? false,
    checkInInterval: preferences.checkInInterval ?? 30,
    dailyStandupTime: preferences.dailyStandupTime ?? '09:00',
    criticalKeywords: preferences.criticalKeywords ?? [
      'urgent',
      'critical',
      'blocking',
      'p0',
      'p1',
    ],
    criticalUsers: preferences.criticalUsers ?? [],
    criticalRepos: preferences.criticalRepos ?? [],
    quietHoursStart: preferences.quietHoursStart ?? '22:00',
    quietHoursEnd: preferences.quietHoursEnd ?? '08:00',
  };

  useEffect(() => {
    loadDecisionGuide();
  }, []);

  async function loadDecisionGuide() {
    try {
      setIsLoading(true);
      setError(null);

      const engine = new RecommendationEngine(defaultPreferences);
      const decisionGuide = await engine.generateDecisionGuide();
      setGuide(decisionGuide);
    } catch (err) {
      console.error('Failed to load decision guide:', err);
      setError(err instanceof Error ? err.message : 'Failed to load decision guide');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Detail markdown="# Loading Decision Guide...\n\nGathering tasks from your configured sources..." />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Decision Guide\n\n${error}\n\nPlease check your API tokens in preferences.`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={loadDecisionGuide} icon={Icon.RotateClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  if (!guide) {
    return (
      <Detail markdown="# No Decision Guide Available\n\nUnable to generate recommendations at this time." />
    );
  }

  const markdown = `# 🎯 What Should I Do Right Now?

**${new Date().toLocaleDateString()}** | Generated at ${guide.timestamp.toLocaleTimeString()}

## 📊 Overview
- **${guide.totalTasks}** total tasks across ${guide.availableSources.join(', ')}
- **${guide.criticalCount}** critical, **${guide.highPriorityCount}** high priority
- **${formatTime(guide.estimatedTotalTime)}** estimated total time

## 🎯 Focus Recommendation
${guide.focusRecommendation}

## 🔥 Top Recommendations

${guide.topRecommendations
  .map(
    (task, index) => `
### ${index + 1}. ${getPriorityIcon(task.priorityLevel)} ${getSourceIcon(task.source)} ${task.title}
**Priority:** ${task.priorityLevel} (${task.score}/10) | **Est:** ${formatTime(task.estimatedTime || 30)}
${task.recommendedAction}

${task.description ? `> ${task.description.substring(0, 200)}${task.description.length > 200 ? '...' : ''}` : ''}

[${task.url}](${task.url})
`
  )
  .join('\n')}

## ⏱️ Time Breakdown
${Object.entries(guide.timeBreakdown)
  .filter(([_, time]) => time > 0)
  .map(
    ([level, time]) =>
      `- **${level.charAt(0).toUpperCase() + level.slice(1)}:** ${formatTime(time)}`
  )
  .join('\n')}

## 📝 Next Actions
${guide.nextActions.map((action) => `- ${action}`).join('\n')}

---
*Powered by Developer Decision Navigator*`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Guide"
            onAction={loadDecisionGuide}
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <Action.Push
            title="Start Focus Session"
            icon={Icon.Play}
            target={<FocusSessionView task={guide.topRecommendations[0]} />}
          />
          <Action.Push
            title="View All Tasks"
            icon={Icon.List}
            target={<AllTasksView tasks={guide.topRecommendations} />}
          />
        </ActionPanel>
      }
    />
  );
}
