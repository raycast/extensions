export default {
  mini: (name: string) => {
    return `https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/20/solid/${name}.svg`;
  },
  solid: (name: string) => {
    return `https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/solid/${name}.svg`;
  },
  outline: (name: string) => {
    return `https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/outline/${name}.svg`;
  },
  tags: () => {
    return "https://raw.githubusercontent.com/tailwindlabs/heroicons.com/master/src/data/tags.js";
  },
};
