type Gifts = {
  name: string;
  image: string;
};

type Character = {
  name: string;
  birthday: string;
  loves: Gifts[];
  likes: Gifts[];
  hates: Gifts[];
  dislikes: Gifts[];
};
