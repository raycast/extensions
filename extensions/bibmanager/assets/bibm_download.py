import bibmanager.bib_manager as bibm
import bibmanager.pdf_manager as pdf
import sys

if __name__ == "__main__":
    key = sys.argv[1]

    bibm.load()
    bib = bibm.find(key=key)
    if bib is not None and bib.bibcode is not None:
        pdf.fetch(bib.bibcode, replace=False)
    else:
        raise ValueError('Could not fetch pdf')

    bibm.load()
    bib = bibm.find(key=key)
    if bib.pdf is None:
        raise ValueError('Could not fetch pdf')
