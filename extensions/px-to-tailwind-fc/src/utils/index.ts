type Item = { label: string; width: string; px: number };
const tailwindData: Item[] = [
  { label: 'px',	width: '0.0625rem', px: 1 },
  { label: '0.5',	width: '0.125rem', px: 2},
  { label: '1',	width: '0.25rem', px: 4},
  { label: '1.5',	width: '0.375rem', px: 6},
  { label: '2',	width: '0.5rem', px: 8},
  { label: '2.5',	width: '0.625rem', px: 10},
  { label: '3',	width: '0.75rem', px: 12},
  { label: '3.5',	width: '0.875rem', px: 14},
  { label: '4',	width: '1rem', px: 16},
  { label: '5',	width: '1.25rem', px: 20},
  { label: '6',	width: '1.5rem', px: 24},
  { label: '7',	width: '1.75rem', px: 28},
  { label: '8',	width: '2rem', px: 32},
  { label: '9',	width: '2.25rem', px: 36},
  { label: '10',	width: '2.5rem', px: 40},
  { label: '11',	width: '2.75rem', px: 44},
  { label: '12',	width: '3rem', px: 48},
  { label: '14',	width: '3.5rem', px: 56},
  { label: '16',	width: '4rem', px: 64},
  { label: '20',	width: '5rem', px: 80},
  { label: '24',	width: '6rem', px: 96},
  { label: '28',	width: '7rem', px: 112},
  { label: '32',	width: '8rem', px: 128},
  { label: '36',	width: '9rem', px: 144},
  { label: '40',	width: '10rem', px: 160},
  { label: '44',	width: '11rem', px: 176},
  { label: '48',	width: '12rem', px: 192 },
  { label: '52',	width: '13rem', px: 208 },
  { label: '56',	width: '14rem', px: 224 },
  { label: '60',	width: '15rem', px: 240 },
  { label: '64',	width: '16rem', px: 256 },
  { label: '72',	width: '18rem', px: 288 },
  { label: '80',	width: '20rem', px: 320 },
  { label: '96',	width: '24rem', px: 384 },
];

const oldValuesMap = [
  {label: 'xs', value: 4},
  {label: 'sm', value: 8},
  {label: 'base', value: 16},
  {label: 'md', value: 24},
  {label: 'lg', value: 32},
  {label: 'xl', value: 48},
  {label: 'xxl', value: 64},
  {label: '2xl', value: 64},
  {label: 'xxxl', value: 96},
  {label: '3xl', value: 96},
  {label: 'xxxxl', value: 128},
  {label: '4xl', value: 128},
]

export type Result = { isExact?: boolean; value: Item | null };

export const findOldValue = (value: string): Result | null => {
  const match = oldValuesMap.find((oldValue) => oldValue.label === value);

  if (match) {
    return findNearestTwValue(match.value);
  }

  return null;
}

export const findNearestTwValue = (value: number) => {
  const result = tailwindData.reduce((acc, item) => {
    if (acc.value?.px === value) return acc;

    if (item.px === value) {
      return {
        isExact: true,
        value: item,
      }
    }
    if (!acc.value || Math.abs(item.px - value) <= Math.abs(acc.value?.px - value)) {
      return {
        isExact: false,
        value: item,
      }
    }

    return acc;
  }, { isExact: false, value: null } as Result);

  return result;
}