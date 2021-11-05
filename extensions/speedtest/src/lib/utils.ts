export function pingToString(ping: number | undefined): string {
    return ping === undefined ? "?" : ping.toFixed(1) + " ms";
}

export function speedToString(speed: number | undefined): string {
    if (speed === undefined) {
        return "?";
    }
    let bits = speed * 8;
    const units = ['', 'K', 'M', 'G', 'T'];
    const places = [0, 1, 2, 3, 3];
    let unit = 0;
    while (bits >= 2000 && unit < 4) {
        unit++;
        bits /= 1000;
    }
    return `${bits.toFixed(places[unit])} ${units[unit]}bps`;
}