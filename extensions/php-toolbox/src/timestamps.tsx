import {Action, ActionPanel, Clipboard, List} from "@raycast/api";
import {useEffect, useState} from "react";
import {
    addDays,
    addMonths,
    addWeeks,
    addYears,
    endOfDay,
    format,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
    getUnixTime,
    fromUnixTime,
} from "date-fns";

export default function PhpTimestampHelper() {
    const [clipboardTimestamp, setClipboardTimestamp] = useState<number | null>(null);
    const [clipboardFormatted, setClipboardFormatted] = useState<string | null>(null);

    const now = new Date();

    const timestamps = [
        {
            'section': 'Today',
            'timestamps': [
                {label: 'Now', value: now},
                {label: 'Start of Today', value: startOfDay(now)},
                {label: 'End of Today', value: endOfDay(now)},
            ],
        },
        {
            'section': 'Past',
            'timestamps': [
                {label: 'Yesterday', value: addDays(now, -1)},
                {label: 'Start of Week', value: startOfWeek(now)},
                {label: 'Start of Month', value: startOfMonth(now)},
                {label: 'Start of Year', value: startOfYear(now)},
            ],
        },
        {
            'section': 'Future',
            'timestamps': [
                {label: 'Tomorrow', value: addDays(now, 1)},
                {label: 'Next Week', value: addWeeks(now, 1)},
                {label: 'Next Month', value: addMonths(now, 1)},
                {label: 'Year Year', value: addYears(now, 1)},
            ],
        },
    ];

    useEffect(() => {
        Clipboard.readText().then(text => {
            if (text && text.match(/^\s*\d{10}\s*$/)) {
                const timestamp = parseInt(text.trim());
                setClipboardTimestamp(timestamp);
                setClipboardFormatted(format(fromUnixTime(timestamp), 'yyyy-MM-dd h:mmaaa'));
            }
        });
    }, []);

    return (
        <List>
            {null !== clipboardFormatted && (
                <List.Section title="From Your Clipboard">
                    <List.Item
                        title={clipboardFormatted}
                        subtitle={`${clipboardTimestamp}`}
                        actions={
                            <ActionPanel>
                                <Action.CopyToClipboard content={clipboardFormatted}/>
                            </ActionPanel>
                        }
                    />
                </List.Section>
            )}

            { timestamps.map(({ section, timestamps }) => (
                <List.Section title={section}>
                    { timestamps.map(({ label, value }) => (
                        <List.Item
                            title={`${getUnixTime(value)}`}
                            subtitle={ label }
                            actions={
                                <ActionPanel>
                                    <Action.CopyToClipboard content={`${getUnixTime(value)}`}/>
                                </ActionPanel>
                            }
                        />
                    ))}
                </List.Section>
            ))}
        </List>
    );
}
