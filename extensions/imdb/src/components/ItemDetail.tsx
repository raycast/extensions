import { Detail, Icon } from '@raycast/api';
import { DetailedItem } from '../data/fetchDetails';

interface ItemDetailProps {
  item: DetailedItem;
}
export const ItemDetail = ({ item }: ItemDetailProps) => {
  const {
    Actors,
    Awards,
    BoxOffice,
    Country,
    Director,
    Genre,
    imdbID,
    imdbVotes,
    Plot,
    Poster,
    Rated,
    Ratings,
    Released,
    Runtime,
    Title,
    totalSeasons,
    Type,
    Website,
    Writer,
    Year,
  } = item;

  const poster = Poster !== 'N/A' ? `<img src="${Poster}" height="300" />` : '';
  const plot = Plot !== 'N/A' ? Plot : 'no plot available';

  return (
    <Detail
      markdown={`${poster}\n\n${plot}`}
      navigationTitle={`${Title} (${Year})`}
      metadata={
        <Detail.Metadata>
          {Type !== 'series' && (
            <Detail.Metadata.Label title="Director" text={Director} />
          )}
          <Detail.Metadata.Label title="Writer" text={Writer} />
          <Detail.Metadata.Label title="Actors" text={Actors} />
          <Detail.Metadata.Label title="Released" text={Released} />
          <Detail.Metadata.Label title="Runtime" text={Runtime} />
          {totalSeasons && (
            <Detail.Metadata.Label title="Season" text={totalSeasons} />
          )}
          <Detail.Metadata.Label title="Rated" text={Rated} />
          <Detail.Metadata.Label title="Genre" text={Genre} />
          <Detail.Metadata.Label title="Country" text={Country} />
          <Detail.Metadata.Label title="Awards" text={Awards} />
          {BoxOffice && (
            <Detail.Metadata.Label title="BoxOffice" text={BoxOffice} />
          )}
          <Detail.Metadata.Separator />
          {Ratings.map(({ Source, Value }) => {
            const rating =
              Source === 'Internet Movie Database'
                ? `${Value} (${imdbVotes} votes)`
                : Value;

            return (
              <Detail.Metadata.Label
                key={Source}
                title={Source}
                text={rating}
                icon={Icon.Star}
              />
            );
          })}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="IMDb Page"
            target={`https://www.imdb.com/title/${imdbID}/`}
            text={Title}
          />
          {Website && Website !== 'N/A' && (
            <Detail.Metadata.Link
              title="Website"
              target={Website}
              text={Title}
            />
          )}
          <Detail.Metadata.Link
            title="YouTube"
            target={`https://www.youtube.com/results?search_query=${Title.replace(
              /\s/g,
              '+',
            )}+trailer`}
            text="Trailer"
          />
        </Detail.Metadata>
      }
    />
  );
};

export default ItemDetail;
