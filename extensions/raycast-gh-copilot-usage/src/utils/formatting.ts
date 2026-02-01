import { CopilotPlan, ModelUsage, PLAN_QUOTAS, UsageResponse, UsageSummary } from "../types/usage"

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat("en-US").format(num)
}

export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
}

export function formatPeriod(year: number, month?: number): string {
    if (!month) {
        return year.toString()
    }
    const date = new Date(year, month - 1)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
}

export function getUsageLevel(percentage: number): "low" | "medium" | "high" {
    if (percentage < 50) return "low" // Green
    if (percentage < 80) return "medium" // Yellow
    return "high" // Red/Orange
}

export function getNextResetDate(year: number, month?: number): Date {
    const currentMonth = month || new Date().getMonth() + 1
    const currentYear = year

    // Next reset is the 1st of the next month
    if (currentMonth === 12) {
        return new Date(currentYear + 1, 0, 1) // January 1st of next year
    }
    return new Date(currentYear, currentMonth, 1) // 1st of next month
}

export function formatResetDate(date: Date): string {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
        return "Resets today"
    } else if (diffDays === 1) {
        return "Resets tomorrow"
    } else if (diffDays < 7) {
        return `Resets in ${diffDays} days`
    } else {
        return `Resets ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    }
}

export function calculateUsageSummary(response: UsageResponse, plan: CopilotPlan): UsageSummary {
    const { usageItems, timePeriod } = response

    let totalRequests = 0
    let totalCost = 0
    const modelMap = new Map<string, ModelUsage>()

    usageItems.forEach(item => {
        // Use grossQuantity for actual usage tracking (not netQuantity which is billable after discounts)
        totalRequests += item.grossQuantity
        totalCost += item.netAmount

        const existing = modelMap.get(item.model)
        if (existing) {
            existing.requests += item.grossQuantity
            existing.cost += item.netAmount
        } else {
            modelMap.set(item.model, {
                model: item.model,
                requests: item.grossQuantity,
                cost: item.netAmount,
            })
        }
    })

    const modelBreakdown = Array.from(modelMap.values()).sort((a, b) => b.requests - a.requests)

    const pricePerRequest = totalRequests > 0 ? totalCost / totalRequests : 0

    // Quota calculations
    const quotaLimit = PLAN_QUOTAS[plan]
    const remainingRequests = Math.max(0, quotaLimit - totalRequests)
    const usagePercentage = quotaLimit > 0 ? (totalRequests / quotaLimit) * 100 : 0
    const usageLevel = getUsageLevel(usagePercentage)
    const resetDate = getNextResetDate(timePeriod.year, timePeriod.month)

    return {
        totalRequests,
        totalCost,
        pricePerRequest,
        modelBreakdown,
        period: formatPeriod(timePeriod.year, timePeriod.month),
        quotaLimit,
        remainingRequests,
        usagePercentage,
        resetDate,
        usageLevel,
    }
}

export function getEmptyMessage(hasToken: boolean): string {
    if (!hasToken) {
        return "Please configure your GitHub Personal Access Token in preferences"
    }
    return "No Copilot Premium usage data found for this period"
}
