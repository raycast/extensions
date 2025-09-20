# %%
import os
from PIL import Image, ImageOps

# load the background image
background = Image.open('src/icons/command-icon-bg.png')

# list all the PNG images in the folder
images = [os.path.join('src/icons/window-position-templates', f) for f in os.listdir('src/icons/window-position-templates') if f[-3:] == 'png']

# generate light icons for each image and save them in the output folder
for i, filename in enumerate(images):
    # load the image
    alpha_mask = Image.open(filename).convert("RGBA")

    # scale the mask to a suitable size (up to 420x420)
    max_size = 420

    # calculate the scaling factor
    aspect_ratio = alpha_mask.width / alpha_mask.height
    width = height = max_size

    if alpha_mask.width > alpha_mask.height:
        # Landscape image
        height = int(max_size / aspect_ratio)
    else:
        # Portrait or square image
        width = int(max_size * aspect_ratio)

    alpha_mask = alpha_mask.resize((width, height), Image.Resampling.BOX)

    # create white & black background layers with the same size as the alpha mask
    whitebg = Image.new('RGBA', (width, height), color=(255, 255, 255, 255))
    blackbg = Image.new('RGBA', (width, height), color=(0, 19, 20, 255))
    

    border_size = (int((background.width - whitebg.width)/2), int((background.height - whitebg.height)/2))

    # expand the mask & black / white backgrounds to match the size of the background image (pad with transparent pixels)
    whitebg = ImageOps.expand(whitebg, border=border_size, fill=(0, 0, 0, 0))
    blackbg = ImageOps.expand(blackbg, border=border_size, fill=(0, 0, 0, 0))

    alpha_mask = ImageOps.expand(alpha_mask, border=border_size, fill=(0, 0, 0, 0))

    # apply the mask to the background image
    light_icon = Image.composite(whitebg, background, alpha_mask)

    # apply the mask to the background image
    dark_icon = Image.composite(blackbg, background, alpha_mask)

    # save the icon images as PNGs
    # light version
    output_filename_light = filename.replace('src/icons/window-position-templates', 'assets/window-positions')

    if not os.path.exists(os.path.dirname(output_filename_light)):
        os.makedirs(os.path.dirname(output_filename_light))
    with open(output_filename_light, 'wb') as f:
        light_icon.save(output_filename_light)

    # dark version
    output_filename_dark = output_filename_light.replace('.png', '@dark.png')

    if not os.path.exists(os.path.dirname(output_filename_dark)):
        os.makedirs(os.path.dirname(output_filename_dark))
    with open(output_filename_dark, 'wb') as f:
        dark_icon.save(output_filename_dark)
# %%
