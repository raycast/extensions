# Contributing to Music extension

So you want to add some features to the **Music** extension right?
Awesome! Before contributing please be sure to read this document.

## Functional

This extension is written using `fp-ts` module.
If you're not familiar with it or with functional programming please read the documentation first (or just read the code first).
This is to aim to keep the code strongly typed and free from `uncaught exceptions`.

- Models available at `src/util/models.ts`

## Adding a new feature

All the `AppleScript` controls are in the `src/util/scripts` folder.
Each file represents some kind of macro-category.
If you want to add a new script please follow the project structure.

### Library interactions

Seems like the Library is translated locally by the system. So to work on any non english version it must be referenced as `source 1` or `playlist 1`

### Conclusion

Thanks for reading. I appreciate your interest, please make sure to tag me [@Rawnly](https://github.com/rawnly) in any issue or PR.
If you have any questions / problem feel free to ping me on the Raycast Slack at **@fedevitaledev**

### Useful Links

-[Doug's Apple Scripts](http://dougscripts.com/itunes/) - An authority when it comes to iTunes/Music scripts.

**NOTE**

> Every kind of contribution is welcome, but since every PR has to be tested and reviewed the scope and the size are crucial.
> Please try to avoid adding too many features at once. If this is the case, consider splitting your PR into multiple ones.
