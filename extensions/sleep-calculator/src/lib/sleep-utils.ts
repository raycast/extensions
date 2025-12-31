/**
 * Sleep calculation utilities based on 90-minute sleep cycles.
 */

export type Minutes = number; // 0..1439 (minutes since midnight)
export type Meridiem = "AM" | "PM";

export interface Time12h {
    hour: number; // 1..12
    minute: number; // 0..59
    ampm: Meridiem;
}

export interface SleepTime extends Time12h {
    cycles: number;
    totalMinutes: number; // Total sleep duration in minutes
    isRecommended: boolean;
}

// Default sleep parameters
export const FALL_ASLEEP_BUFFER = 15; // minutes
export const CYCLE_LENGTH = 90; // minutes
export const DEFAULT_CYCLES = [3, 4, 5, 6];
export const RECOMMENDED_CYCLES = [5, 6];

/**
 * Convert 12-hour time to minutes since midnight.
 */
export function toMinutes(h: number, m: number, ampm: Meridiem): Minutes {
    if (h < 1 || h > 12) {
        throw new Error(`Invalid hour: ${h}. Expected 1–12.`);
    }
    if (m < 0 || m > 59) {
        throw new Error(`Invalid minute: ${m}. Expected 0–59.`);
    }

    let hh = h % 12;
    if (ampm === "PM") hh += 12;
    return hh * 60 + m;
}

/**
 * Convert minutes since midnight to 12-hour time.
 */
export function fromMinutes(total: Minutes): Time12h {
    // Normalize to 0-1439 range
    total = ((total % 1440) + 1440) % 1440;

    const hh24 = Math.floor(total / 60);
    const mm = total % 60;
    const ampm: Meridiem = hh24 >= 12 ? "PM" : "AM";

    let hh12 = hh24 % 12;
    if (hh12 === 0) hh12 = 12;

    return { hour: hh12, minute: mm, ampm };
}

/**
 * Calculate optimal bedtimes for a given wake-up time.
 */
export function bedtimesForWake(
    wakeH: number,
    wakeM: number,
    wakeAMPM: Meridiem,
    fallAsleep = FALL_ASLEEP_BUFFER,
    cycleLen = CYCLE_LENGTH,
    cycles = DEFAULT_CYCLES
): SleepTime[] {
    const wake = toMinutes(wakeH, wakeM, wakeAMPM);

    return cycles.map((n) => {
        const sleepDuration = n * cycleLen;
        const t = wake - (fallAsleep + sleepDuration);
        const time = fromMinutes(t);

        return {
            ...time,
            cycles: n,
            totalMinutes: sleepDuration,
            isRecommended: RECOMMENDED_CYCLES.includes(n),
        };
    });
}

/**
 * Calculate optimal wake times for a given sleep time.
 */
export function wakeTimesForSleep(
    sleepH: number,
    sleepM: number,
    sleepAMPM: Meridiem,
    fallAsleep = FALL_ASLEEP_BUFFER,
    cycleLen = CYCLE_LENGTH,
    cycles = DEFAULT_CYCLES
): SleepTime[] {
    const sleep = toMinutes(sleepH, sleepM, sleepAMPM);

    return cycles.map((n) => {
        const sleepDuration = n * cycleLen;
        const t = sleep + fallAsleep + sleepDuration;
        const time = fromMinutes(t);

        return {
            ...time,
            cycles: n,
            totalMinutes: sleepDuration,
            isRecommended: RECOMMENDED_CYCLES.includes(n),
        };
    });
}

/**
 * Format a Time12h object for display.
 */
export function formatTime(time: Time12h): string {
    const minuteStr = time.minute.toString().padStart(2, "0");
    return `${time.hour}:${minuteStr} ${time.ampm}`;
}

/**
 * Format duration in minutes to human-readable string.
 */
export function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
}

// Word-to-number mapping for written times
const WORD_TO_NUMBER: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    "twenty-one": 21, "twenty-two": 22, "twenty-three": 23,
    twentyone: 21, twentytwo: 22, twentythree: 23,
};

// Common minute words
const MINUTE_WORDS: Record<string, number> = {
    "o'clock": 0, oclock: 0, oclok: 0,
    fifteen: 15, thirty: 30, "thirty-five": 35, thirtyfive: 35,
    fortyfive: 45, "forty-five": 45, forty: 40, fifty: 50,
    five: 5, ten: 10, twenty: 20, twentyfive: 25, "twenty-five": 25,
};

/**
 * Parse a time string input into components.
 * Supports TONS of formats:
 * - Standard: "7:30 AM", "7:30am", "7:30 am", "7:30AM"
 * - Short: "7am", "7 am", "7a", "7 a", "7p"
 * - With minutes: "7:30pm", "7:30 PM", "7:30p"
 * - 24h: "07:30", "7:30", "14:30"
 * - Military: "0730", "730", "1430"
 * - Hour only: "7", "13", "23"
 * - Keywords: "noon", "midnight"
 * - Dot separator: "7.30", "7.30am"
 * - Semicolon typo: "7;30", "7;30am"
 * - European: "7h30", "19h", "7 h 30"
 * - O'clock: "7 o'clock", "7 oclock"
 * - Half/Quarter: "half past 7", "quarter to 8", "quarter past 3"
 * - Written: "seven", "seven thirty", "seven am"
 * - Descriptive: "7 in the morning", "7 in the evening"
 * - Space separated: "7 30", "7 30 am"
 */
export function parseTimeInput(
    input: string
): { hour: number; minute: number; ampm: Meridiem } | null {
    let trimmed = input.trim().toLowerCase();

    if (!trimmed) return null;

    // === SPECIAL KEYWORDS ===
    if (trimmed === "noon" || trimmed === "12p" || trimmed === "12 p" || trimmed === "midday") {
        return { hour: 12, minute: 0, ampm: "PM" };
    }
    if (trimmed === "midnight" || trimmed === "12a" || trimmed === "12 a") {
        return { hour: 12, minute: 0, ampm: "AM" };
    }

    // === PRE-PROCESSING ===
    // Replace written numbers with digits
    for (const [word, num] of Object.entries(WORD_TO_NUMBER)) {
        trimmed = trimmed.replace(new RegExp(`\\b${word}\\b`, "gi"), num.toString());
    }

    // Normalize separators and am/pm variations
    let normalized = trimmed
        .replace(/\s+/g, " ")                    // collapse spaces
        .replace(/[;.]/g, ":")                   // semicolon/dot -> colon
        .replace(/o'?clock/gi, "")               // remove o'clock
        .replace(/a\.?m\.?/gi, "am")             // normalize am
        .replace(/p\.?m\.?/gi, "pm")             // normalize pm
        .replace(/\s*h\s*/gi, ":")               // European "h" -> colon (7h30 -> 7:30)
        .replace(/in the morning/gi, "am")       // "in the morning" -> am
        .replace(/in the evening/gi, "pm")       // "in the evening" -> pm
        .replace(/in the afternoon/gi, "pm")     // "in the afternoon" -> pm
        .replace(/at night/gi, "pm")             // "at night" -> pm
        .replace(/tonight/gi, "pm")              // "tonight" -> pm
        .replace(/this morning/gi, "am")         // "this morning" -> am
        .replace(/this evening/gi, "pm")         // "this evening" -> pm
        .trim();

    // === HALF PAST / QUARTER TO/PAST ===
    const halfPastMatch = normalized.match(/^half\s*(?:past)?\s*(\d{1,2})\s*(am|pm|a|p)?$/);
    if (halfPastMatch) {
        const hour = parseInt(halfPastMatch[1], 10);
        const ampmChar = halfPastMatch[2];
        if (hour >= 1 && hour <= 12) {
            const ampm: Meridiem = ampmChar?.startsWith("p") ? "PM" : (ampmChar?.startsWith("a") ? "AM" : (hour >= 7 && hour <= 11 ? "AM" : "PM"));
            return { hour, minute: 30, ampm };
        }
    }

    const quarterPastMatch = normalized.match(/^quarter\s*past\s*(\d{1,2})\s*(am|pm|a|p)?$/);
    if (quarterPastMatch) {
        const hour = parseInt(quarterPastMatch[1], 10);
        const ampmChar = quarterPastMatch[2];
        if (hour >= 1 && hour <= 12) {
            const ampm: Meridiem = ampmChar?.startsWith("p") ? "PM" : (ampmChar?.startsWith("a") ? "AM" : (hour >= 7 && hour <= 11 ? "AM" : "PM"));
            return { hour, minute: 15, ampm };
        }
    }

    const quarterToMatch = normalized.match(/^quarter\s*(?:to|til|till|before)\s*(\d{1,2})\s*(am|pm|a|p)?$/);
    if (quarterToMatch) {
        let hour = parseInt(quarterToMatch[1], 10);
        const ampmChar = quarterToMatch[2];
        // "quarter to 8" means 7:45
        hour = hour === 1 ? 12 : hour - 1;
        if (hour >= 1 && hour <= 12) {
            const ampm: Meridiem = ampmChar?.startsWith("p") ? "PM" : (ampmChar?.startsWith("a") ? "AM" : (hour >= 7 && hour <= 11 ? "AM" : "PM"));
            return { hour, minute: 45, ampm };
        }
    }

    // === SPACE-SEPARATED TIME (e.g., "7 30", "7 30 am") ===
    const spaceSepMatch = normalized.match(/^(\d{1,2})\s+(\d{2})\s*(am|pm|a|p)?$/);
    if (spaceSepMatch) {
        const hour = parseInt(spaceSepMatch[1], 10);
        const minute = parseInt(spaceSepMatch[2], 10);
        const ampmChar = spaceSepMatch[3];

        if (minute >= 0 && minute <= 59) {
            if (ampmChar) {
                // Has am/pm indicator
                const ampm: Meridiem = ampmChar.startsWith("p") ? "PM" : "AM";
                if (hour >= 1 && hour <= 12) {
                    return { hour, minute, ampm };
                }
            } else if (hour >= 0 && hour <= 23) {
                // Treat as 24h
                const ampm: Meridiem = hour >= 12 ? "PM" : "AM";
                let hour12 = hour % 12;
                if (hour12 === 0) hour12 = 12;
                return { hour: hour12, minute, ampm };
            }
        }
    }

    // === STANDARD PATTERNS ===

    // Pattern 1: "H:MM AM/PM" or "HH:MM AM/PM" or "H:MMAM" etc
    const colonAmpmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(am|pm|a|p)$/);
    if (colonAmpmMatch) {
        const hour = parseInt(colonAmpmMatch[1], 10);
        const minute = parseInt(colonAmpmMatch[2], 10);
        const ampmChar = colonAmpmMatch[3];
        const ampm: Meridiem = ampmChar.startsWith("p") ? "PM" : "AM";

        if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
            return { hour, minute, ampm };
        }
        return null;
    }

    // Pattern 2: "HAM/PM" or "H AM/PM" (hour only with am/pm, e.g., "7am", "7 am", "7a")
    const hourAmpmMatch = normalized.match(/^(\d{1,2})\s*(am|pm|a|p)$/);
    if (hourAmpmMatch) {
        const hour = parseInt(hourAmpmMatch[1], 10);
        const ampmChar = hourAmpmMatch[2];
        const ampm: Meridiem = ampmChar.startsWith("p") ? "PM" : "AM";

        if (hour >= 1 && hour <= 12) {
            return { hour, minute: 0, ampm };
        }
        return null;
    }

    // Pattern 3: "HMMAM/PM" or "HMM AM/PM" (e.g., "730am", "730 am", "1130pm")
    const shortAmpmMatch = normalized.match(/^(\d{3,4})\s*(am|pm|a|p)$/);
    if (shortAmpmMatch) {
        const digits = shortAmpmMatch[1].padStart(4, "0");
        const hour = parseInt(digits.substring(0, 2), 10);
        const minute = parseInt(digits.substring(2, 4), 10);
        const ampmChar = shortAmpmMatch[2];
        const ampm: Meridiem = ampmChar.startsWith("p") ? "PM" : "AM";

        let hour12 = hour;
        if (hour === 0) hour12 = 12;
        if (hour > 12) hour12 = hour - 12;

        if (hour12 >= 1 && hour12 <= 12 && minute >= 0 && minute <= 59) {
            return { hour: hour12, minute, ampm };
        }
        return null;
    }

    // Pattern 4: "H:MM" or "HH:MM" (24h format, no am/pm)
    const colon24Match = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (colon24Match) {
        const hour24 = parseInt(colon24Match[1], 10);
        const minute = parseInt(colon24Match[2], 10);

        if (hour24 >= 0 && hour24 <= 23 && minute >= 0 && minute <= 59) {
            const ampm: Meridiem = hour24 >= 12 ? "PM" : "AM";
            let hour12 = hour24 % 12;
            if (hour12 === 0) hour12 = 12;
            return { hour: hour12, minute, ampm };
        }
        return null;
    }

    // Pattern 5: "HHMM" or "HMM" (military time, e.g., "0730", "730", "1430")
    const militaryMatch = normalized.match(/^(\d{3,4})$/);
    if (militaryMatch) {
        const digits = militaryMatch[1].padStart(4, "0");
        const hour24 = parseInt(digits.substring(0, 2), 10);
        const minute = parseInt(digits.substring(2, 4), 10);

        if (hour24 >= 0 && hour24 <= 23 && minute >= 0 && minute <= 59) {
            const ampm: Meridiem = hour24 >= 12 ? "PM" : "AM";
            let hour12 = hour24 % 12;
            if (hour12 === 0) hour12 = 12;
            return { hour: hour12, minute, ampm };
        }
        return null;
    }

    // Pattern 6: Just a single or double digit hour (e.g., "7", "11", "23")
    const hourOnlyMatch = normalized.match(/^(\d{1,2})$/);
    if (hourOnlyMatch) {
        const hour = parseInt(hourOnlyMatch[1], 10);

        if (hour >= 0 && hour <= 23) {
            const ampm: Meridiem = hour >= 12 ? "PM" : "AM";
            let hour12 = hour % 12;
            if (hour12 === 0) hour12 = 12;
            return { hour: hour12, minute: 0, ampm };
        }
        return null;
    }

    // Pattern 7: Written minute words (e.g., "7 thirty", "7 fifteen am")
    const writtenMinMatch = normalized.match(/^(\d{1,2})\s+(fifteen|thirty|fortyfive|forty-five|forty|fifty|five|ten|twenty|twentyfive|twenty-five)\s*(am|pm|a|p)?$/);
    if (writtenMinMatch) {
        const hour = parseInt(writtenMinMatch[1], 10);
        const minuteWord = writtenMinMatch[2].replace("-", "");
        const minute = MINUTE_WORDS[minuteWord] ?? 0;
        const ampmChar = writtenMinMatch[3];

        if (ampmChar) {
            const ampm: Meridiem = ampmChar.startsWith("p") ? "PM" : "AM";
            if (hour >= 1 && hour <= 12) {
                return { hour, minute, ampm };
            }
        } else if (hour >= 0 && hour <= 23) {
            const ampm: Meridiem = hour >= 12 ? "PM" : "AM";
            let hour12 = hour % 12;
            if (hour12 === 0) hour12 = 12;
            return { hour: hour12, minute, ampm };
        }
    }

    return null;
}

/**
 * Get current time as Time12h.
 */
export function getCurrentTime(): Time12h {
    const now = new Date();
    const hour24 = now.getHours();
    const minute = now.getMinutes();

    const ampm: Meridiem = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    return { hour: hour12, minute, ampm };
}
