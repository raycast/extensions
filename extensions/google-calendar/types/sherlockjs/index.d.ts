declare module 'sherlockjs' {
  interface ParsedEvent {
    eventTitle: string | null;
    startDate: Date | null;
    endDate: Date | null;
    isAllDay: boolean;
  }

  function parse(input: string): ParsedEvent;

  export default { parse };
}
