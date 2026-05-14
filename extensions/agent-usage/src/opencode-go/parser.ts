import type { OpencodegoUsage, OpencodegoError } from "./types";

interface SolidHydrationData {
  billing?: {
    customerID?: string;
    paymentMethodLast4?: string;
    balance?: number;
    monthlyLimit?: number;
    monthlyUsage?: number;
    subscriptionPlan?: string | null;
    liteSubscriptionID?: string;
  };
  usage?: {
    mine?: boolean;
    useBalance?: boolean;
    rollingUsage?: { status: string; resetInSec: number; usagePercent: number };
    weeklyUsage?: { status: string; resetInSec: number; usagePercent: number };
    monthlyUsage?: { status: string; resetInSec: number; usagePercent: number };
  };
}

export function parseOpencodegoHtml(html: string): { usage: OpencodegoUsage | null; error: OpencodegoError | null } {
  try {
    if (!html || typeof html !== "string") {
      return { usage: null, error: { type: "parse_error", message: "Invalid HTML response" } };
    }

    // Extract Solid.js hydration data
    const data = extractSolidHydrationData(html);

    if (!data.billing && !data.usage) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Could not find usage data in OpenCode Go page. The page format may have changed.",
        },
      };
    }

    // Build usage quotas from the data
    const quotas: NonNullable<OpencodegoUsage["quotas"]> = [];

    // Primary quota defaults
    const primary = {
      label: "Monthly",
      used: 0,
      limit: 100,
      unit: "%",
    };

    // Rolling usage (2-hour window)
    if (data.usage?.rollingUsage) {
      const ru = data.usage.rollingUsage;
      // usagePercent is percent USED
      quotas.push({
        label: "Rolling (2h)",
        used: ru.usagePercent,
        limit: 100,
        unit: "%",
      });
    }

    // Weekly usage
    if (data.usage?.weeklyUsage) {
      const wu = data.usage.weeklyUsage;
      quotas.push({
        label: "Weekly",
        used: wu.usagePercent,
        limit: 100,
        unit: "%",
      });
    }

    // Monthly usage - this is the primary quota, don't add to quotas array
    if (data.usage?.monthlyUsage) {
      const mu = data.usage.monthlyUsage;
      // Monthly is the primary quota (not added to quotas to avoid duplication)
      primary.label = "Monthly";
      primary.used = mu.usagePercent;
    }

    if (quotas.length === 0 && primary.used === 0 && !data.usage?.monthlyUsage) {
      return {
        usage: null,
        error: { type: "parse_error", message: "No quota data found in response" },
      };
    }

    // Determine reset date from monthly quota (furthest out)
    let resetsAt: string | null = null;
    let maxResetSec = 0;

    if (data.usage?.monthlyUsage?.resetInSec) {
      maxResetSec = data.usage.monthlyUsage.resetInSec;
    } else if (data.usage?.weeklyUsage?.resetInSec && data.usage.weeklyUsage.resetInSec > maxResetSec) {
      maxResetSec = data.usage.weeklyUsage.resetInSec;
    } else if (data.usage?.rollingUsage?.resetInSec && data.usage.rollingUsage.resetInSec > maxResetSec) {
      maxResetSec = data.usage.rollingUsage.resetInSec;
    }

    if (maxResetSec > 0) {
      const resetDate = new Date(Date.now() + maxResetSec * 1000);
      resetsAt = resetDate.toISOString();
    }

    const usage: OpencodegoUsage = {
      planName: data.billing?.subscriptionPlan || "Go",
      primary,
      quotas,
      resetsAt,
    };

    return { usage, error: null };
  } catch (err) {
    return {
      usage: null,
      error: {
        type: "parse_error",
        message: err instanceof Error ? err.message : "Failed to parse OpenCode Go response",
      },
    };
  }
}

function extractSolidHydrationData(html: string): SolidHydrationData {
  const data: SolidHydrationData = {};

  // Find the Solid.js hydration script
  const scriptMatch = html.match(/<script>self\.\$R=[\s\S]*?<\/script>/);
  if (!scriptMatch) {
    return data;
  }

  const script = scriptMatch[0];

  // Try multiple patterns to extract billing data - be more flexible with indices
  // Pattern 1: Original pattern with specific indices
  let billingSection = script.match(
    /\$R\[24\]\(\$R\[14\],\$R\[\d+\]=\{([^}]*customerID[\s\S]*?)\}\);\$R\[24\]\(\$R\[16\]/,
  );

  // Pattern 2: More generic - just look for the billing assignment
  if (!billingSection) {
    billingSection = script.match(
      /\$R\[24\]\([^,]+,\$R\[\d+\]=\{([^}]*customerID[^}]+paymentMethodLast4[\s\S]*?)\}\);/,
    );
  }

  // Pattern 3: Even more generic - find by customerID field
  if (!billingSection) {
    const billingMatch = script.match(
      /customerID:"cus_[^"]+",paymentMethodID:[^}]+paymentMethodLast4:"\d+",balance:\d+/,
    );
    if (billingMatch) {
      // Find the enclosing object
      const startIdx = script.lastIndexOf("{", script.indexOf(billingMatch[0]));
      const endIdx = script.indexOf("}", script.indexOf(billingMatch[0]) + billingMatch[0].length);
      if (startIdx !== -1 && endIdx !== -1) {
        billingSection = ["", script.substring(startIdx + 1, endIdx)];
      }
    }
  }

  if (billingSection) {
    data.billing = parseBillingData(billingSection[1]);
  }

  // Try multiple patterns for usage data
  // Pattern 1: Original with specific indices
  let usageSection = script.match(
    /\$R\[24\]\(\$R\[18\],\$R\[\d+\]=\{([^}]*rollingUsage[\s\S]*?)\}\);\$R\[24\]\(\$R\[20\]/,
  );

  // Pattern 2: More generic
  if (!usageSection) {
    usageSection = script.match(/\$R\[24\]\([^,]+,\$R\[\d+\]=\{([^}]*rollingUsage[^}]+weeklyUsage[\s\S]*?)\}\);/);
  }

  // Pattern 3: Find by rollingUsage field
  if (!usageSection) {
    const usageMatch = script.match(/rollingUsage:\$R\[\d+\]=\{status:"[^"]+",resetInSec:\d+,usagePercent:\d+\}/);
    if (usageMatch) {
      // Find the enclosing object
      const startIdx = script.lastIndexOf("{", script.indexOf(usageMatch[0]));
      const endIdx = script.indexOf("}", script.indexOf(usageMatch[0]) + usageMatch[0].length);
      if (startIdx !== -1 && endIdx !== -1) {
        // Need to include the full nested structure
        // Look for mine and useBalance before rollingUsage
        const objStart = script.substring(0, startIdx).lastIndexOf("{") + 1;
        usageSection = ["", script.substring(objStart, endIdx)];
      }
    }
  }

  if (usageSection) {
    data.usage = parseUsageData(usageSection[1]);
  }

  return data;
}

function parseBillingData(str: string): SolidHydrationData["billing"] {
  const billing: NonNullable<SolidHydrationData["billing"]> = {};

  const customerID = str.match(/customerID:"([^"]+)"/);
  if (customerID) billing.customerID = customerID[1];

  const paymentMethodLast4 = str.match(/paymentMethodLast4:"([^"]+)"/);
  if (paymentMethodLast4) billing.paymentMethodLast4 = paymentMethodLast4[1];

  const balance = str.match(/balance:(\d+)/);
  if (balance) billing.balance = Number.parseInt(balance[1], 10);

  const monthlyLimit = str.match(/monthlyLimit:(\d+)/);
  if (monthlyLimit) billing.monthlyLimit = Number.parseInt(monthlyLimit[1], 10);

  const monthlyUsage = str.match(/monthlyUsage:(\d+)/);
  if (monthlyUsage) billing.monthlyUsage = Number.parseInt(monthlyUsage[1], 10);

  const subscriptionPlan = str.match(/subscriptionPlan:([^,]+)/);
  if (subscriptionPlan) {
    const val = subscriptionPlan[1].trim();
    billing.subscriptionPlan = val === "null" ? null : val.replace(/"/g, "");
  }

  const liteSubscriptionID = str.match(/liteSubscriptionID:"([^"]+)"/);
  if (liteSubscriptionID) billing.liteSubscriptionID = liteSubscriptionID[1];

  return billing;
}

function parseUsageData(str: string): SolidHydrationData["usage"] {
  const usage: NonNullable<SolidHydrationData["usage"]> = {
    mine: false,
    useBalance: false,
  };

  const mine = str.match(/mine:([^,]+)/);
  if (mine) usage.mine = mine[1].trim() === "!0" || mine[1].trim() === "true";

  const useBalance = str.match(/useBalance:([^,]+)/);
  if (useBalance) usage.useBalance = useBalance[1].trim() === "!0" || useBalance[1].trim() === "true";

  // Match rollingUsage with nested $R reference
  const rollingMatch = str.match(/rollingUsage:\$R\[\d+\]=\{([^}]+)\}/);
  if (rollingMatch) {
    usage.rollingUsage = parseUsageQuota(rollingMatch[1]);
  }

  // Match weeklyUsage
  const weeklyMatch = str.match(/weeklyUsage:\$R\[\d+\]=\{([^}]+)\}/);
  if (weeklyMatch) {
    usage.weeklyUsage = parseUsageQuota(weeklyMatch[1]);
  }

  // Match monthlyUsage
  const monthlyMatch = str.match(/monthlyUsage:\$R\[\d+\]=\{([^}]+)\}/);
  if (monthlyMatch) {
    usage.monthlyUsage = parseUsageQuota(monthlyMatch[1]);
  }

  return usage;
}

function parseUsageQuota(str: string): { status: string; resetInSec: number; usagePercent: number } {
  const status = str.match(/status:"([^"]+)"/)?.[1] || "unknown";
  const resetInSec = Number.parseInt(str.match(/resetInSec:(\d+)/)?.[1] || "0", 10);
  const usagePercent = Number.parseInt(str.match(/usagePercent:(\d+)/)?.[1] || "0", 10);

  return { status, resetInSec, usagePercent };
}
