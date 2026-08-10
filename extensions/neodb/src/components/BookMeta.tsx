import { Book } from "../types";
import { Detail } from "@raycast/api";

interface BookMetaProps {
  data: Book;
  rating: number;
}

const BookMeta: React.FC<BookMetaProps> = ({ data, rating }) => {
  const { subtitle, author, language, translator, pub_house, pub_year, isbn, pages, orig_title, price } = data;

  return (
    <Detail.Metadata>
      {orig_title && <Detail.Metadata.Label title="Original Title" text={orig_title} />}
      {subtitle && <Detail.Metadata.Label title="Subtitle" text={subtitle} />}
      {rating && <Detail.Metadata.Label title="Rating" text={rating.toString()} />}
      {author.length !== 0 && <Detail.Metadata.Label title="Author" text={author.join(", ")} />}
      {translator.length !== 0 && <Detail.Metadata.Label title="Translator" text={translator.join(", ")} />}
      {language && <Detail.Metadata.Label title="Subtitle" text={language} />}
      {pub_house && <Detail.Metadata.Label title="Publisher" text={pub_house} />}
      {pub_year && <Detail.Metadata.Label title="Published" text={pub_year.toString()} />}
      {pages && <Detail.Metadata.Label title="Pages" text={pages} />}
      {price && <Detail.Metadata.Label title="Price" text={price} />}
      {isbn && <Detail.Metadata.Label title="ISBN" text={isbn} />}
    </Detail.Metadata>
  );
};
export default BookMeta;
