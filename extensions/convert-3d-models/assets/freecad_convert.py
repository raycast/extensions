#!/usr/bin/freecadcmd
#!/Applications/FreeCAD.app/Contents/MacOS/FreeCADCmd



import sys

FREECAD_LIB_PATH = sys.argv[1] + "Contents/Resources/lib"
print(FREECAD_LIB_PATH)
sys.path.append(FREECAD_LIB_PATH) #<-- added, otherwise FreeCAD is not found

import os
import FreeCAD
import Part
import Mesh

#import Blender                 #<-- kept as a reminder for how well those two open source gems interact


# The original author wrote this script. The syntax was figured out by recording and evaluating some macros in FreeCAD. Thanks open source movement.


in_f, out_f = sys.argv[2], sys.argv[3]  #<-- repaired, out of bounds
in_fn,in_ext = os.path.splitext(in_f)
out_fn,out_ext = os.path.splitext(out_f)
print(in_ext, " -> ", out_ext)

mesh_formats = ['.stl', '.obj', '.3mf', '.x3d', '.x3dz']

def main():
    shape = Part.Shape()
    #shape_formats = ['.brp', '.igs', '.stp']
    if in_ext in mesh_formats:
        print("Opening mesh file: ", in_f)
        Mesh.open(in_f)
        o = FreeCAD.getDocument("Unnamed").findObjects()[0]
        #print("dir: ", dir(o))
        if out_ext in mesh_formats:
            print("Exporting to mesh file: ", out_f)
            Mesh.export([o], out_f)
        else:
            # TODO This is not optimizing the resulting amount of faces!
            # see http://www.freecadweb.org/wiki/index.php?title=Mesh_to_Part
            shape.makeShapeFromMesh(o.Mesh.Topology, 0.05)  # tolerance for sewing
            exportParametric(shape, out_f, out_ext)
    elif out_ext in mesh_formats:
        print("Opening parametric file: ", in_f)
        Part.open(in_f)
        o = FreeCAD.getDocument("Unnamed").findObjects()[0]
        print("Exporting to mesh file: ", out_f)
        Mesh.export([o], out_f)
    else:
        # Parametric -> Parametric
        print("Opening parametric file: ", in_f)
        shape.read(in_f)
        exportParametric(shape, out_f, out_ext)



def exportParametric(shape, out_f, out_ext):
    print("Exporting to parametric file: ", out_f)
    if out_ext == '.brp':
        shape.exportBrep(out_f)
    elif out_ext == '.igs':
        shape.exportIges(out_f)
    elif out_ext == '.stl':
        shape.exportStl(out_f)
    elif out_ext == '.stp':
        shape.exportStep(out_f)
    else:
        print("Export to '%s' not supported." % (out_ext))

main()

def main():
   pass
if __name__=='__main__':
   main()