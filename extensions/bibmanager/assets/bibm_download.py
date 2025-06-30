import bibmanager.bib_manager as bibm
import bibmanager.pdf_manager as pdf
import bibmanager.utils as u
import sys
import signal


TIMEOUT = 120

def handler(signum, frame):
    print("out of time")
    raise Exception

def return_pdf(bib):
    pdf = u.BM_PDF() + bib.pdf
    sys.stdout.write("PDF: "+ pdf)
    sys.stdout.flush()

if __name__ == "__main__":
    key = sys.argv[1]

    bibm.load()
    bib = bibm.find(key=key)

    if bib.pdf is not None:
        return_pdf(bib)
    else:
        if bib is not None and bib.bibcode is not None:
            signal.signal(signal.SIGALRM, handler)
            signal.alarm(TIMEOUT)
            try:
                pdf.fetch(bib.bibcode, replace=False)
            except Exception:
                raise TimeoutError()
            signal.alarm(0)
        else:
            raise ValueError('Could not fetch pdf')

        bibm.load()
        bib = bibm.find(key=key)
        if bib.pdf is None:
            raise ValueError('Could not fetch pdf')
        else:
            return_pdf(bib)