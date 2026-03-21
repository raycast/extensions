from PIL import Image, ImageDraw

# Create a 512x512 icon with rounded corners
size = 512
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Background - dark gradient-like color
draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=100, fill=(30, 30, 30, 255))

# Draw a simple music note shape
# Note head (filled ellipse)
note_x, note_y = 280, 340
draw.ellipse([(note_x-50, note_y-30), (note_x+50, note_y+30)], fill=(255, 90, 95, 255))

# Stem
draw.rectangle([(note_x+40, note_y-180), (note_x+50, note_y)], fill=(255, 90, 95, 255))

# Flag
draw.polygon([(note_x+50, note_y-180), (note_x+110, note_y-140), (note_x+50, note_y-100)], fill=(255, 90, 95, 255))

# Second note head
note2_x = note_x - 120
draw.ellipse([(note2_x-50, note2_y:=note_y-20, note2_x+50, note_y+10)], fill=(255, 90, 95, 255)) if False else None

# Simpler approach - just the single note
img.save('assets/extension-icon.png')
print("Icon created")
