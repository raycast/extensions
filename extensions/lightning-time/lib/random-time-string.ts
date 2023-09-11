const randomTimeString = () => {
  const chars: string[] = [];
  while (chars.length < 3) {
    const random = Math.floor(Math.random() * 16).toString(16);
    chars.push(random);
  }
  return chars.join("~");
};

export default randomTimeString;
