export function formatArgumentMonth(date: string): Date {
    const months: any = {
        jan: 1,
        january: 1,
        feb: 2,
        february: 2,
        mar: 3,
        march: 3,
        apr: 4,
        april: 4,
        may: 5,
        jun: 6,
        june: 6,
        jul: 7,
        july: 7,
        aug: 8,
        august: 8,
        sep: 9,
        september: 9,
        oct: 10,
        october: 10,
        nov: 11,
        november: 11,
        dec: 12,
        december: 12
    };
    if (!date) {
        return new Date();
    }
    if (date.toLowerCase() === "last" || date.toLowerCase() === "l") {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return lastMonth;
    }
    if (date.toLowerCase() === "this" || date.toLowerCase() === "t") {
        return new Date();
    }
    if (months[date.toLowerCase()]) {
        const thisMonth = new Date();
        thisMonth.setMonth(months[date.toLowerCase()] - 1);
        return thisMonth;
    }
    if (parseInt(date)) {
        const thisMonth = new Date();
        thisMonth.setMonth(parseInt(date) - 1);
        return thisMonth;
    }
    return new Date();
}
