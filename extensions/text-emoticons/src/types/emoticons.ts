export type Emoticon = {
  name: string;
  emoticon: string;
};

export type EmoticonCategory = {
  slug: string;
  title: string;
  emoticons: Emoticon[];
};
