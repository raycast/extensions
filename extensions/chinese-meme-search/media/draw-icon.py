from PIL import Image, ImageDraw
S=4
im=Image.new('RGBA',(512*S,512*S),(0,0,0,0))
d=ImageDraw.Draw(im)
def box(b,fill,r=0): d.rounded_rectangle(tuple(int(x*S) for x in b),radius=r*S,fill=fill)
def line(p,fill,w):d.line([(int(x*S),int(y*S)) for x,y in p],fill=fill,width=w*S,joint='curve')
def poly(p,fill):d.polygon([(x*S,y*S) for x,y in p],fill=fill)
ink='#452542'
# Offset sticker shadow, amber sticker and a folded corner.
box((57,61,467,443),'#593659',92)
box((38,36,448,418),ink,88)
box((48,46,438,408),'#FFC653',78)
# A folded sticker corner creates a different silhouette from a round emoji.
poly([(370,408),(438,340),(438,408)],ink)
poly([(371,397),(426,343),(371,343)],'#FFE6A4')
# One arched eye, one open eye: playful without tracing the reference.
d.arc((120*S,151*S,208*S,223*S),180,345,fill=ink,width=15*S)
box((282,159,312,215),ink,15)
box((287,165,296,179),'#FFFFFF',4)
# Bold offset smiling mouth, asymmetric highlight.
d.arc((149*S,199*S,335*S,323*S),5,170,fill=ink,width=19*S)
box((101,238,149,251),'#EF8D68',6)
box((317,238,365,251),'#EF8D68',6)
line([(94,116),(109,96),(140,86)],'#FFF0BD',9)
im.resize((512,512),Image.Resampling.LANCZOS).save('assets/icon.png')
