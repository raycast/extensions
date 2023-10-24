# Notes on the venv folder and related binaries

As per the [raycast extension docs](https://developers.raycast.com/basics/prepare-an-extension-for-store#binary-dependencies-and-additional-configuration), I should avoid bundling large dependancies. I believe, however, that bundling this venv folder is justified, as:

1. It's sources are well-known, coming from 2 things:
  1. The cpython project itself
  2. The requirements.txt in this folder, which is created from just running `pip install open-interpreter` on the command line
2. It would be difficult and problematic to recreate this on a user's machine
  1. I don't know for sure what version of Python a user will have installed, or if it will be compatible
  2. I already can't validate hashes of distributed files - that's just not something the Python community does for random files. Pre-bundled deps that I've confirmed are correct are safer here IMO.
  3. Any alternative (bundling my python deps into one of those weird python executable bundles) is even worse, as it is even more inscrutable.