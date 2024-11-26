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
  icons: () => {
    return "https://gist.githubusercontent.com/trbndev/1c89990f3e2f35b06ff5eebc800e3ca4/raw/a60dc3efb5af533e6546315eb40f88d0816bd7fe/heroicons-all";
  },
};
