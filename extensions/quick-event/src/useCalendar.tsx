import { showToast, Toast, AI, environment } from '@raycast/api';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { CalendarEvent } from './types';
import { getEndDate, getStartDate, preprocessQuery } from './dates';
import osascript from 'osascript-tag';
import Sherlock from 'sherlockjs';

export const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === 'string') {
      const message = err.replace('execution error: Error: ', '');
      console.log(err);
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: message,
      });
    }
  }
};

export function useCalendar() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [calendarText, setCalendarText] = useState('');

  async function parse(query: string) {
    try {
      setIsLoading(true);
      setCalendarText(query);

      if (query.length === 0) {
        setResults([]);
      } else {
        const preprocessedQuery = preprocessQuery(query);

        const parsedEvent = Sherlock.parse(preprocessedQuery);

        let location = '';
        if (environment.canAccess(AI)) {
          location = await AI.ask(
            `Help me filter the location for this event: "${query}", just type the location or empty string`,
          );
        }

        const event: CalendarEvent = {
          ...parsedEvent,
          location: location,
          id: nanoid(),
        };

        if (!event.startDate) {
          event.startDate = getStartDate();
        }

        if (!event.endDate) {
          event.endDate = getEndDate(event.startDate);
        }

        setResults([event]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('error', error);
      showToast({
        style: Toast.Style.Failure,
        title: 'Could not parse event',
        message: String(error),
      });
    }
  }

  return {
    isLoading,
    results,
    calendarText,
    parse,
  };
}
