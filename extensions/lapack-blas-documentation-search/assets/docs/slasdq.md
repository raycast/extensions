```fortran
subroutine slasdq (
        character uplo,
        integer sqre,
        integer n,
        integer ncvt,
        integer nru,
        integer ncc,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( ldvt, * ) vt,
        integer ldvt,
        real, dimension( ldu, * ) u,
        integer ldu,
        real, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( * ) work,
        integer info
)
```

SLASDQ computes the singular value decomposition (SVD) of a real
(upper or lower) bidiagonal matrix with diagonal D and offdiagonal
E, accumulating the transformations if desired. Letting B denote
the input bidiagonal matrix, the algorithm computes orthogonal
matrices Q and P such that B = Q \* S \* P\*\*T (P\*\*T denotes the transpose
of P). The singular values S are overwritten on D.

The input matrix U  is changed to U  \* Q  if desired.
The input matrix VT is changed to P\*\*T \* VT if desired.
The input matrix C  is changed to Q\*\*T \* C  if desired.

See  by J. Demmel and W. Kahan,
LAPACK Working Note #3, for a detailed description of the algorithm.

## Parameters
UPLO : CHARACTER\*1 [in]
> On entry, UPLO specifies whether the input bidiagonal matrix
> is upper or lower bidiagonal, and whether it is square are
> not.
> UPLO = 'U' or 'u'   B is upper bidiagonal.
> UPLO = 'L' or 'l'   B is lower bidiagonal.

SQRE : INTEGER [in]
> = 0: then the input matrix is N-by-N.
> = 1: then the input matrix is N-by-(N+1) if UPLU = 'U' and
> (N+1)-by-N if UPLU = 'L'.
> 
> The bidiagonal matrix has
> N = NL + NR + 1 rows and
> M = N + SQRE >= N columns.

N : INTEGER [in]
> On entry, N specifies the number of rows and columns
> in the matrix. N must be at least 0.

NCVT : INTEGER [in]
> On entry, NCVT specifies the number of columns of
> the matrix VT. NCVT must be at least 0.

NRU : INTEGER [in]
> On entry, NRU specifies the number of rows of
> the matrix U. NRU must be at least 0.

NCC : INTEGER [in]
> On entry, NCC specifies the number of columns of
> the matrix C. NCC must be at least 0.

D : REAL array, dimension (N) [in,out]
> On entry, D contains the diagonal entries of the
> bidiagonal matrix whose SVD is desired. On normal exit,
> D contains the singular values in ascending order.

E : REAL array. [in,out]
> dimension is (N-1) if SQRE = 0 and N if SQRE = 1.
> On entry, the entries of E contain the offdiagonal entries
> of the bidiagonal matrix whose SVD is desired. On normal
> exit, E will contain 0. If the algorithm does not converge,
> D and E will contain the diagonal and superdiagonal entries
> of a bidiagonal matrix orthogonally equivalent to the one
> given as input.

VT : REAL array, dimension (LDVT, NCVT) [in,out]
> On entry, contains a matrix which on exit has been
> premultiplied by P\*\*T, dimension N-by-NCVT if SQRE = 0
> and (N+1)-by-NCVT if SQRE = 1 (not referenced if NCVT=0).

LDVT : INTEGER [in]
> On entry, LDVT specifies the leading dimension of VT as
> declared in the calling (sub) program. LDVT must be at
> least 1. If NCVT is nonzero LDVT must also be at least N.

U : REAL array, dimension (LDU, N) [in,out]
> On entry, contains a  matrix which on exit has been
> postmultiplied by Q, dimension NRU-by-N if SQRE = 0
> and NRU-by-(N+1) if SQRE = 1 (not referenced if NRU=0).

LDU : INTEGER [in]
> On entry, LDU  specifies the leading dimension of U as
> declared in the calling (sub) program. LDU must be at
> least max( 1, NRU ) .

C : REAL array, dimension (LDC, NCC) [in,out]
> On entry, contains an N-by-NCC matrix which on exit
> has been premultiplied by Q\*\*T  dimension N-by-NCC if SQRE = 0
> and (N+1)-by-NCC if SQRE = 1 (not referenced if NCC=0).

LDC : INTEGER [in]
> On entry, LDC  specifies the leading dimension of C as
> declared in the calling (sub) program. LDC must be at
> least 1. If NCC is nonzero, LDC must also be at least N.

WORK : REAL array, dimension (4\*N) [out]
> Workspace. Only referenced if one of NCVT, NRU, or NCC is
> nonzero, and if N is at least 2.

INFO : INTEGER [out]
> On exit, a value of 0 indicates a successful exit.
> If INFO < 0, argument number -INFO is illegal.
> If INFO > 0, the algorithm did not converge, and INFO
> specifies how many superdiagonals did not converge.
