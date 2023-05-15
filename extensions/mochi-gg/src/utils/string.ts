export function formatCurrency(num = 0, currency = "USD") {
  try {
    if (num <= 0.001) {
      return `$${num}`;
    }

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      compactDisplay: "short",
      currency,
    });

    return formatter.format(+num.toFixed(2));
  } catch (error) {
    return `$${num}`;
  }
}

export function formatNumber(num = 0) {
  try {
    if (Math.abs(num) <= 0.01) {
      return num.toString();
    }

    const formatter = new Intl.NumberFormat("en-US", { style: "decimal" });

    return formatter.format(+num.toFixed(3));
  } catch (err) {
    return num.toString();
  }
}

export function formatPercent(num = 0) {
  try {
    if (Math.abs(num) <= 0.1) {
      return `${num}%`;
    }

    const formatter = new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 2,
      maximumSignificantDigits: 4,
    });

    return formatter.format(num / 100);
  } catch (err) {
    return `${num}%`;
  }
}
