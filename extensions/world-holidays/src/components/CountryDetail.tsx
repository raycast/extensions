import { List } from '@raycast/api';
import { useMemo } from 'react';
import { useCountryData } from '../hooks/useCountryData';

const noDataMarkdown = (countryName: string): string => `
  No data available for ${countryName} at this time.
  
  You can contribute to the Holidays data project at [https://github.com/dr-prodigy/python-holidays](https://github.com/dr-prodigy/python-holidays)
`;

const buildHolidaysMarkdown = (
  countryName: string,
  holidays: Array<Holiday>,
  photo?: Photo | null,
): string => {
  const holidaysText = holidays
    .map((holiday) => {
      return `- **${holiday.altName || holiday.name}**: ${
        holiday.readableDate
      }`;
    })
    .join('\n');
  const photoText = photo
    ? `![${
        photo.description ||
        photo.alt_description ||
        `Random photo from ${countryName}`
      }](${photo.url})\n_Photo by [${photo.author.name}](${
        photo.author.link
      }) on [Unsplash](${photo.link})_`
    : '';
  return `${holidaysText}\n\n${photoText}  `;
};

interface CountryDetailProps {
  country: Country;
}

export const CountryDetail = (props: CountryDetailProps) => {
  const { country } = props;
  const { name: countryName } = country;

  const { holidays, photo, loading, error } = useCountryData(country);

  const markdown = useMemo<string>(() => {
    if (loading) return `Loading…`;
    if (error || !holidays.length) return noDataMarkdown(countryName);
    return buildHolidaysMarkdown(countryName, holidays, photo);
  }, [holidays, photo, loading, error]);

  return <List.Item.Detail markdown={markdown} isLoading={loading} />;
};
