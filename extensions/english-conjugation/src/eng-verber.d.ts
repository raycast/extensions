declare module "eng-verber" {
  type ConjugatedVerb = {
    infinitive: string;
    singularPresent: string;
    singularPast: string;
    pluralPast: string;
    perfect: string;
    continuous: string;
  };

  export default function conjugate(verb: string): ConjugatedVerb;
}
