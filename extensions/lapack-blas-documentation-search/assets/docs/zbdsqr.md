```fortran
subroutine zbdsqr (
        character uplo,
        integer n,
        integer ncvt,
        integer nru,
        integer ncc,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        complex*16, dimension( ldvt, * ) vt,
        integer ldvt,
        complex*16, dimension( ldu, * ) u,
        integer ldu,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZBDSQR computes the singular values and, optionally, the right and/or
left singular vectors from the singular value decomposition (SVD) of
a real N-by-N (upper or lower) bidiagonal matrix B using the implicit
zero-shift QR algorithm.  The SVD of B has the form

B = Q \* S \* P\*\*H

where S is the diagonal matrix of singular values, Q is an orthogonal
matrix of left singular vectors, and P is an orthogonal matrix of
right singular vectors.  If left singular vectors are requested, this
subroutine actually returns U\*Q instead of Q, and, if right singular
vectors are requested, this subroutine returns P\*\*H\*VT instead of
P\*\*H, for given complex input matrices U and VT.  When U and VT are
the unitary matrices that reduce a general matrix A to bidiagonal
form: A = U\*B\*VT, as computed by ZGEBRD, then

A = (U\*Q) \* S \* (P\*\*H\*VT)

is the SVD of A.  Optionally, the subroutine may also compute Q\*\*H\*C
for a given complex input matrix C.

See  by J. Demmel and W. Kahan,
LAPACK Working Note #3 (or SIAM J. Sci. Statist. Comput. vol. 11,
no. 5, pp. 873-912, Sept 1990) and
by
B. Parlett and V. Fernando, Technical Report CPAM-554, Mathematics
Department, University of California at Berkeley, July 1992
for a detailed description of the algorithm.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  B is upper bidiagonal;
> = 'L':  B is lower bidiagonal.

N : INTEGER [in]
> The order of the matrix B.  N >= 0.

NCVT : INTEGER [in]
> The number of columns of the matrix VT. NCVT >= 0.

NRU : INTEGER [in]
> The number of rows of the matrix U. NRU >= 0.

NCC : INTEGER [in]
> The number of columns of the matrix C. NCC >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the n diagonal elements of the bidiagonal matrix B.
> On exit, if INFO=0, the singular values of B in decreasing
> order.

E : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, the N-1 offdiagonal elements of the bidiagonal
> matrix B.
> On exit, if INFO = 0, E is destroyed; if INFO > 0, D and E
> will contain the diagonal and superdiagonal elements of a
> bidiagonal matrix orthogonally equivalent to the one given
> as input.

VT : COMPLEX\*16 array, dimension (LDVT, NCVT) [in,out]
> On entry, an N-by-NCVT matrix VT.
> On exit, VT is overwritten by P\*\*H \* VT.
> Not referenced if NCVT = 0.

LDVT : INTEGER [in]
> The leading dimension of the array VT.
> LDVT >= max(1,N) if NCVT > 0; LDVT >= 1 if NCVT = 0.

U : COMPLEX\*16 array, dimension (LDU, N) [in,out]
> On entry, an NRU-by-N matrix U.
> On exit, U is overwritten by U \* Q.
> Not referenced if NRU = 0.

LDU : INTEGER [in]
> The leading dimension of the array U.  LDU >= max(1,NRU).

C : COMPLEX\*16 array, dimension (LDC, NCC) [in,out]
> On entry, an N-by-NCC matrix C.
> On exit, C is overwritten by Q\*\*H \* C.
> Not referenced if NCC = 0.

LDC : INTEGER [in]
> The leading dimension of the array C.
> LDC >= max(1,N) if NCC > 0; LDC >=1 if NCC = 0.

RWORK : DOUBLE PRECISION array, dimension (LRWORK) [out]
> LRWORK = 4\*N, if NCVT = NRU = NCC = 0, and
> LRWORK = 4\*(N-1), otherwise

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  If INFO = -i, the i-th argument had an illegal value
> > 0:  the algorithm did not converge; D and E contain the
> elements of a bidiagonal matrix which is orthogonally
> similar to the input matrix B;  if INFO = i, i
> elements of E have not converged to zero.
