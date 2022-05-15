# Laravel version updates

When a new laravel version comes out you should add this new version to the dropdown in the package.json

Then execute the following script on the documentation page of that version E.g. https://laravel.com/docs/8.x:

```js
let list = {};
document
  .querySelector(".docs_sidebar ul")
  .querySelectorAll(":scope >li")
  .forEach((element) => {
    let listHeader = element.querySelector(":scope > h2");
    let listItems = element.querySelectorAll(":scope > ul > li > a");
    if (!listHeader || !listItems) return;

    list[listHeader.innerText] = [...listItems].map((anchor) => {
      return { title: anchor.innerText, url: anchor.href };
    });
  });

console.log(JSON.stringify(list, null, 2));
```

This will build you the file you should save in `src/documentation`

After creating the file add it to the list of documentation in index.tsx

It is also good practice to bring documentation/master.json up-to-date with https://laravel.com/docs/master
