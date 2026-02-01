import {
    Action,
    ActionPanel,
    Color,
    getPreferenceValues,
    Icon,
    List,
    showToast,
    Toast,
} from "@raycast/api"
import { usePromise } from "@raycast/utils"
import { fetchCopilotUsage, getCurrentUser, GitHubAPIError } from "./api/github"
import { CopilotPlan } from "./types/usage"
import {
    calculateUsageSummary,
    formatNumber,
    formatPercentage,
    formatResetDate,
    getEmptyMessage,
} from "./utils/formatting"

interface Preferences {
    githubToken: string
    copilotPlan: CopilotPlan
}

export default function ViewCopilotUsage() {
    const preferences = getPreferenceValues<Preferences>()
    const plan = preferences.copilotPlan || "pro"

    const { data: username, isLoading: isLoadingUser } = usePromise(
        async () => {
            if (!preferences.githubToken) {
                throw new Error("No GitHub token configured")
            }
            return await getCurrentUser(preferences.githubToken)
        },
        [],
        {
            onError: error => {
                showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to fetch user",
                    message: error.message,
                })
            },
        },
    )

    const {
        data: usageData,
        isLoading: isLoadingUsage,
        revalidate,
    } = usePromise(
        async (username: string, token: string) => {
            if (!token || !username) {
                return null
            }
            return await fetchCopilotUsage(username, token)
        },
        [username || "", preferences.githubToken],
        {
            execute: !!username && !!preferences.githubToken,
            onError: error => {
                if (error instanceof GitHubAPIError) {
                    showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to fetch usage",
                        message: error.message,
                    })
                } else {
                    showToast({
                        style: Toast.Style.Failure,
                        title: "Error",
                        message: error instanceof Error ? error.message : "Unknown error occurred",
                    })
                }
            },
        },
    )

    const isLoading = isLoadingUser || isLoadingUsage
    const summary = usageData ? calculateUsageSummary(usageData, plan) : null

    const handleRefresh = async () => {
        await showToast({
            style: Toast.Style.Animated,
            title: "Refreshing usage data...",
        })
        await revalidate()
        await showToast({
            style: Toast.Style.Success,
            title: "Usage data refreshed",
        })
    }

    // Determine color based on usage level
    const getUsageColor = (level: "low" | "medium" | "high"): Color => {
        switch (level) {
            case "low":
                return Color.Green
            case "medium":
                return Color.Yellow
            case "high":
                return Color.Red
        }
    }

    if (!preferences.githubToken) {
        return (
            <List>
                <List.EmptyView
                    icon={Icon.Key}
                    title="GitHub Token Required"
                    description={getEmptyMessage(false)}
                    actions={
                        <ActionPanel>
                            <Action.OpenInBrowser
                                title="Open Token Settings"
                                url="https://github.com/settings/tokens?type=beta"
                            />
                        </ActionPanel>
                    }
                />
            </List>
        )
    }

    if (!summary && !isLoading) {
        return (
            <List>
                <List.EmptyView
                    icon={Icon.Info}
                    title="No Usage Data"
                    description={getEmptyMessage(true)}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Refresh"
                                onAction={handleRefresh}
                                icon={Icon.ArrowClockwise}
                            />
                        </ActionPanel>
                    }
                />
            </List>
        )
    }

    return (
        <List isLoading={isLoading} navigationTitle="GitHub Copilot Premium Usage">
            {summary && (
                <>
                    <List.Section title={`Usage Summary - ${summary.period}`}>
                        {/* Usage Percentage - PRIMARY METRIC */}
                        <List.Item
                            title="Usage"
                            subtitle={formatResetDate(summary.resetDate)}
                            icon={{
                                source: Icon.BarChart,
                                tintColor: getUsageColor(summary.usageLevel),
                            }}
                            accessories={[
                                {
                                    text: formatPercentage(summary.usagePercentage),
                                    icon: {
                                        source: Icon.Dot,
                                        tintColor: getUsageColor(summary.usageLevel),
                                    },
                                },
                            ]}
                            actions={
                                <ActionPanel>
                                    <Action.CopyToClipboard
                                        title="Copy Usage Percentage"
                                        content={formatPercentage(summary.usagePercentage)}
                                    />
                                    <Action
                                        title="Refresh"
                                        onAction={handleRefresh}
                                        icon={Icon.ArrowClockwise}
                                    />
                                </ActionPanel>
                            }
                        />

                        {/* Requests Used / Total */}
                        <List.Item
                            title="Requests Used"
                            subtitle={`${formatNumber(summary.totalRequests)} / ${formatNumber(summary.quotaLimit)}`}
                            icon={{ source: Icon.Hashtag, tintColor: Color.Blue }}
                            accessories={[
                                {
                                    text: `${formatNumber(summary.totalRequests)} of ${formatNumber(summary.quotaLimit)}`,
                                },
                            ]}
                            actions={
                                <ActionPanel>
                                    <Action.CopyToClipboard
                                        title="Copy Request Count"
                                        content={`${summary.totalRequests} / ${summary.quotaLimit}`}
                                    />
                                    <Action
                                        title="Refresh"
                                        onAction={handleRefresh}
                                        icon={Icon.ArrowClockwise}
                                    />
                                </ActionPanel>
                            }
                        />

                        {/* Remaining Requests */}
                        <List.Item
                            title="Remaining Requests"
                            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                            accessories={[{ text: formatNumber(summary.remainingRequests) }]}
                            actions={
                                <ActionPanel>
                                    <Action.CopyToClipboard
                                        title="Copy Remaining Requests"
                                        content={summary.remainingRequests.toString()}
                                    />
                                    <Action
                                        title="Refresh"
                                        onAction={handleRefresh}
                                        icon={Icon.ArrowClockwise}
                                    />
                                </ActionPanel>
                            }
                        />
                    </List.Section>

                    {/* Model Breakdown */}
                    {summary.modelBreakdown.length > 0 && (
                        <List.Section title="Usage by Model">
                            {summary.modelBreakdown.map(model => {
                                const modelPercentage =
                                    summary.quotaLimit > 0
                                        ? (model.requests / summary.quotaLimit) * 100
                                        : 0
                                return (
                                    <List.Item
                                        key={model.model}
                                        title={model.model}
                                        subtitle={`${formatPercentage(modelPercentage)} of quota`}
                                        icon={{ source: Icon.Layers, tintColor: Color.Purple }}
                                        accessories={[
                                            { text: `${formatNumber(model.requests)} requests` },
                                        ]}
                                        actions={
                                            <ActionPanel>
                                                <Action.CopyToClipboard
                                                    title="Copy Model Stats"
                                                    content={`${model.model}: ${formatNumber(model.requests)} requests (${formatPercentage(modelPercentage)})`}
                                                />
                                                <Action
                                                    title="Refresh"
                                                    onAction={handleRefresh}
                                                    icon={Icon.ArrowClockwise}
                                                />
                                            </ActionPanel>
                                        }
                                    />
                                )
                            })}
                        </List.Section>
                    )}

                    {/* Actions */}
                    <List.Section title="Actions">
                        <List.Item
                            title="Refresh Data"
                            icon={{ source: Icon.ArrowClockwise, tintColor: Color.Blue }}
                            actions={
                                <ActionPanel>
                                    <Action
                                        title="Refresh"
                                        onAction={handleRefresh}
                                        icon={Icon.ArrowClockwise}
                                    />
                                </ActionPanel>
                            }
                        />
                    </List.Section>
                </>
            )}
        </List>
    )
}
