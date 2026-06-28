export function randomPlaceholder(): string {
  const options = [
    "Completed a TODO",
    "Wrote a blog post",
    "Wrote a Raycast extension",
    "Had a meeting with a client",
    "Went to the gym",
    "Ate a peanut butter sandwich",
  ];

  return options[Math.floor(Math.random() * options.length)];
}
