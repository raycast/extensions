export const processSeasons = (count?: string) => {
  if (count === 'N/A') {
    return 'N/A';
  } else if (Number(count) === 1) {
    return `${count} season`;
  } else {
    return `${count} seasons`;
  }
};

const typeToTitleMap: Record<string, string | undefined> = {
  movie: 'Movie',
  series: 'Series',
  game: 'Game',
};
export const mapTypeToTitle = (type: string) => typeToTitleMap[type] ?? type;
