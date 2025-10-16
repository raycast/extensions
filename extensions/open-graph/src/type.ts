export interface OpenGraph {
  title: string;
  description: string;
  og: {
    title: string;
    description: string;
    image: string;
    url: string;
  };
  twitter: {
    title: string;
    description: string;
    image: string;
    card: string;
  };
}
