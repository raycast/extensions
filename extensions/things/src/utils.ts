import dayjs from 'dayjs';

export const plural = (count: number, string: string) => `${count} ${string}${count > 1 ? 's' : ''}`;

export const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

export const getDateString = (date: Date): string => dayjs(date).format('YYYY-MM-DD');
