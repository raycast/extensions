import { Album } from "../types";
import { Detail } from "@raycast/api";

interface MusicMetaProps {
  data: Album;
  rating: number;
}

const MusicMeta: React.FC<MusicMetaProps> = ({ data, rating }) => {
  const { other_title, genre, artist, company, duration, release_date, barcode } = data as Album;

  return (
    <Detail.Metadata>
      {rating && <Detail.Metadata.Label title="Rating" text={rating.toString()} />}
      {other_title.length !== 0 && <Detail.Metadata.Label title="Alternative Title" text={other_title.join(", ")} />}
      {genre.length !== 0 && (
        <Detail.Metadata.TagList title="Genre">
          {genre.map((genre) => (
            <Detail.Metadata.TagList.Item text={genre} color={"#eed535"} key={genre} />
          ))}
        </Detail.Metadata.TagList>
      )}
      {artist.length !== 0 && <Detail.Metadata.Label title="Artist" text={artist.join(", ")} />}
      {company.length !== 0 && <Detail.Metadata.Label title="Company" text={company.join(", ")} />}
      {duration && <Detail.Metadata.Label title="Duration" text={duration.toString()} />}
      {release_date && <Detail.Metadata.Label title="Artist" text={release_date.toString()} />}
      {barcode && <Detail.Metadata.Label title="Barcode" text={barcode} />}
    </Detail.Metadata>
  );
};
export default MusicMeta;
