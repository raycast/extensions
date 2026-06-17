type Animal = "cat" | "dog" | "horse";

type Plant = {
  name: string;
  commonNames: string[];
  scientificName: string;
  family: string | null;
  link: string;
  toxicTo: Animal[];
  imageUrl: string | null;
  toxicPrinciples: string | null;
  clinicalSigns: string | null;
};
