const VN_TELEX = {
  á: "as",
  à: "af",
  ả: "ar",
  ã: "ax",
  ạ: "aj",
  ắ: "aws",
  ằ: "awf",
  ẳ: "awr",
  ẵ: "awx",
  ặ: "awj",
  ă: "aw",
  ấ: "aas",
  ầ: "aaf",
  ẩ: "aar",
  ẫ: "aax",
  ậ: "aaj",
  â: "aa",
  đ: "dd",
  é: "es",
  è: "ef",
  ẻ: "er",
  ẽ: "ex",
  ẹ: "ej",
  ế: "ees",
  ề: "eef",
  ể: "eer",
  ễ: "eex",
  ệ: "eej",
  ê: "ee",
  í: "is",
  ì: "if",
  ỉ: "ir",
  ĩ: "ix",
  ị: "ij",
  ó: "os",
  ò: "of",
  ỏ: "or",
  õ: "ox",
  ọ: "oj",
  ố: "oos",
  ồ: "oof",
  ổ: "oor",
  ỗ: "oox",
  ộ: "ooj",
  ô: "oo",
  ớ: "ows",
  ờ: "owf",
  ở: "owr",
  ỡ: "owx",
  ợ: "owj",
  ơ: "ow",
  ú: "us",
  ù: "uf",
  ủ: "ur",
  ũ: "ux",
  ụ: "uj",
  ứ: "uws",
  ừ: "uwf",
  ử: "uwr",
  ữ: "uwx",
  ự: "uwj",
  ư: "uw",
  ý: "ys",
  ỳ: "yf",
  ỷ: "yr",
  ỹ: "yx",
  ỵ: "yj",
};

function strToTelex(str) {
  return str
    .split("")
    .map((char) => VN_TELEX[char] || char)
    .join("");
}

const input = process.argv.slice(2).join(" ") || "";
if (!input) {
  console.log("Usage: node src/vn2telex.js <vietnamese text>");
  console.log('  e.g. node src/vn2telex.js "cái gì vậy"');
  process.exit(1);
}
console.log(strToTelex(input));
