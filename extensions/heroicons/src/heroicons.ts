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
  icons: () => {
    return "https://gist.githubusercontent.com/haackt/1c89990f3e2f35b06ff5eebc800e3ca4/raw/3afc0addb29d874617451f1479af71dc9a36ac95/heroicons-all";
  },
};
