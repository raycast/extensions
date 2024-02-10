export const today = () => {
  const now: Date = new Date();
  const year: number = now.getFullYear();
  const month: number = now.getMonth() + 1;
  const day: number = now.getDate();

  const formattedMonth: string = month.toString().padStart(2, "0");
  const formattedDay: string = day.toString().padStart(2, "0");

  const currentDate: string = `${year}-${formattedMonth}-${formattedDay}`;
  return currentDate;
};

export const tomorrow = () => {
  const now: Date = new Date();
  const year: number = now.getFullYear();
  const month: number = now.getMonth() + 1;
  const day: number = now.getDate() + 1;

  const formattedMonth: string = month.toString().padStart(2, "0");
  const formattedDay: string = day.toString().padStart(2, "0");

  const currentDate: string = `${year}-${formattedMonth}-${formattedDay}`;
  return currentDate;
};

export function getTimeDifference(startDateTime: string, endDateTime: string): number {
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);

  const differenceInMilliseconds = endDate.getTime() - startDate.getTime();
  const differenceInMinutes = differenceInMilliseconds / (1000 * 60);

  return differenceInMinutes;
}

export function calculatePastDate(numberOfDays: number): string {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - numberOfDays);

  const year = currentDate.getFullYear().toString().padStart(4, "0");
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = (currentDate.getDate() + 1).toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}
