export interface UsageItem {
    product: string
    sku: string
    model: string
    unitType: string
    pricePerUnit: number
    grossQuantity: number
    grossAmount: number
    discountQuantity: number
    discountAmount: number
    netQuantity: number
    netAmount: number
}

export interface TimePeriod {
    year: number
    month?: number
    day?: number
}

export interface UsageResponse {
    timePeriod: TimePeriod
    user: string
    usageItems: UsageItem[]
}

export interface UsageSummary {
    totalRequests: number
    totalCost: number
    pricePerRequest: number
    modelBreakdown: ModelUsage[]
    period: string
    // Quota tracking fields
    quotaLimit: number
    remainingRequests: number
    usagePercentage: number
    resetDate: Date
    usageLevel: "low" | "medium" | "high"
}

export interface ModelUsage {
    model: string
    requests: number
    cost: number
}

// Copilot plan types
export type CopilotPlan = "free" | "pro" | "pro-plus" | "business" | "enterprise"

// Premium request quotas per plan
export const PLAN_QUOTAS: Record<CopilotPlan, number> = {
    free: 50,
    pro: 300,
    "pro-plus": 1500,
    business: 300,
    enterprise: 1000,
}
