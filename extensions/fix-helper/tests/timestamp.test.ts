function formatFixTimestamp(value: string): string | null {
    const regex = /^(\d{4})(\d{2})(\d{2})-(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
    const match = value.match(regex);

    if (match) {
        const [, year, month, day, hour, minute, second, ms] = match;
        const date = new Date(Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second),
            ms ? parseInt(ms) : 0
        ));
        return date.toLocaleString();
    }
    return null;
}

const tests = [
    "20231127-12:00:00",
    "20231127-12:00:00.123",
    "invalid-date"
];

tests.forEach(t => {
    console.log(`Input: ${t} => Output: ${formatFixTimestamp(t)}`);
});
