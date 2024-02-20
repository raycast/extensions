const splitTranscript = (transcript: string, max_chars: number) =>
  transcript?.split(/(?<=\.)/).reduce(
    (acc, curr) => {
      if (acc[acc.length - 1].length + curr.length > max_chars) {
        const splitTranscription = curr.match(new RegExp(`.{1,${max_chars}}`, "g"));
        splitTranscription?.forEach((split) => {
          acc.push(split);
        });
      } else {
        acc[acc.length - 1] += curr;
      }
      return acc;
    },
    [""]
  );

export default splitTranscript;
