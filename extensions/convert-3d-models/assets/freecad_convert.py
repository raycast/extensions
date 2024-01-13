import sys

# Import FreeCAD library
freecad_lib_path = sys.argv[1] + "Contents/Resources/lib"
print(freecad_lib_path)
sys.path.append(freecad_lib_path) 

import os
import FreeCAD
import Part
import Mesh

input_file, output_file = sys.argv[2], sys.argv[3] # python3 freecad_convert.py <path> <in> <out>
input_filename, input_ext = os.path.splitext(input_file)
output_filename, output_ext = os.path.splitext(output_file)
print(input_ext, " -> ", output_ext)

mesh_formats = ['.3mf', '.amf', '.obj', '.off', '.ply', '.smf', '.stl', '.x3d', '.x3dz'] # Define the formats that this script will attempt to do mesh-to-mesh conversion on. Not all formats are supported by FreeCAD

def main():
    shape = Part.Shape()
    #shape_formats = ['.brp', '.igs', '.stp']
    if input_ext in mesh_formats:
        # Input is a Mesh format
        print("Opening mesh file: ", input_file)
        Mesh.open(input_file)
        mesh_object = FreeCAD.getDocument("Unnamed").findObjects()[0]
        if output_ext in mesh_formats:
            # Mesh -> Mesh
            print("Exporting to mesh file: ", output_file)
            Mesh.export([mesh_object], output_file)
        else:
            # Mesh -> Parametric
            # TODO This is not optimizing the resulting amount of faces!
            # see http://www.freecadweb.org/wiki/index.php?title=Mesh_to_Part
            shape.makeShapeFromMesh(mesh_object.Mesh.Topology, 0.08)  # tolerance for sewing
            export_parametric(shape, output_file, output_ext)
    elif output_ext in mesh_formats:
        # Parametric -> Mesh
        print("Opening parametric file: ", input_file)
        Part.open(input_file)
        parametric_object = FreeCAD.getDocument("Unnamed").findObjects()[0]
        print("Exporting to mesh file: ", output_file)
        Mesh.export([parametric_object], output_file)
    else:
        # Parametric -> Parametric
        print("Opening parametric file: ", input_file)
        shape.read(input_file)
        export_parametric(shape, output_file, output_ext)

def export_parametric(shape, output_file, output_ext):
    print("Exporting to parametric file: ", output_file)
    if output_ext == '.brp':
        shape.exportBrep(output_file)
    elif output_ext == '.igs':
        shape.exportIges(output_file)
    elif output_ext == '.stl':
        shape.exportStl(output_file)
    elif output_ext == '.stp':
        shape.exportStep(output_file)
    else:
        print("Export to '%s' not supported." % (output_ext))

main()

def main():
   pass
if __name__=='__main__':
   main()