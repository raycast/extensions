import slugifyOrig from "slugify";

const slugify: typeof slugifyOrig = (string, options = {}) => {
  const opts = typeof options === "string" ? { replacement: options } : options;
  return slugifyOrig(string, {
    lower: true,
    strict: true,
    ...opts,
  });
};
slugify.extend = slugifyOrig.extend;

export default slugify;
