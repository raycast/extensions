export interface Story {
  _id: string;
  cuid: string;
  title: string;
  brief: string;
  slug: string;
  totalReactions: number;
  dateAdded: string;
  author: {
    photo: string;
    username: string;
    blogHandle: string;
    publicationDomain: string;
  };
}
