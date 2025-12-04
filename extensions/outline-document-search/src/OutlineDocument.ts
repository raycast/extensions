interface Author {
  name: string;
}

export default interface Document {
  collaboratorIds: string[];
  collectionId: string;
  createdAt: string;
  createdBy: Author;
  emoji: string;
  id: string;
  title: string;
  text: string;
  updatedAt: string;
  url: string;
}
