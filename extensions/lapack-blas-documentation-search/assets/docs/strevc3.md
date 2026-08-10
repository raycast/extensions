```fortran
subroutine strevc3 (
        character side,
        character howmny,
        logical, dimension( * ) select,
        integer n,
        real, dimension( ldt, * ) t,
        integer ldt,
        real, dimension( ldvl, * ) vl,
        integer ldvl,
        real, dimension( ldvr, * ) vr,
        integer ldvr,
        integer mm,
        integer m,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

STREVC3 computes some or all of the right and/or left eigenvectors of
a real upper quasi-triangular matrix T.
Matrices of this type are produced by the Schur factorization of
a real general matrix:  A = Q\*T\*Q\*\*T, as computed by SHSEQR.

The right eigenvector x and the left eigenvector y of T corresponding
to an eigenvalue w are defined by:

T\*x = w\*x,     (y\*\*T)\*T = w\*(y\*\*T)

where y\*\*T denotes the transpose of the vector y.
The eigenvalues are not input to this routine, but are read directly
from the diagonal blocks of T.

This routine returns the matrices X and/or Y of right and left
eigenvectors of T, or the products Q\*X and/or Q\*Y, where Q is an
input matrix. If Q is the orthogonal factor that reduces a matrix
A to Schur form T, then Q\*X and Q\*Y are the matrices of right and
left eigenvectors of A.

This uses a Level 3 BLAS version of the back transformation.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'R':  compute right eigenvectors only;
> = 'L':  compute left eigenvectors only;
> = 'B':  compute both right and left eigenvectors.

HOWMNY : CHARACTER\*1 [in]
> = 'A':  compute all right and/or left eigenvectors;
> = 'B':  compute all right and/or left eigenvectors,
> backtransformed by the matrices in VR and/or VL;
> = 'S':  compute selected right and/or left eigenvectors,
> as indicated by the logical array SELECT.

SELECT : LOGICAL array, dimension (N) [in,out]
> If HOWMNY = 'S', SELECT specifies the eigenvectors to be
> computed.
> If w(j) is a real eigenvalue, the corresponding real
> eigenvector is computed if SELECT(j) is .TRUE..
> If w(j) and w(j+1) are the real and imaginary parts of a
> complex eigenvalue, the corresponding complex eigenvector is
> computed if either SELECT(j) or SELECT(j+1) is .TRUE., and
> on exit SELECT(j) is set to .TRUE. and SELECT(j+1) is set to
> .FALSE..
> Not referenced if HOWMNY = 'A' or 'B'.

N : INTEGER [in]
> The order of the matrix T. N >= 0.

T : REAL array, dimension (LDT,N) [in]
> The upper quasi-triangular matrix T in Schur canonical form.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

VL : REAL array, dimension (LDVL,MM) [in,out]
> On entry, if SIDE = 'L' or 'B' and HOWMNY = 'B', VL must
> contain an N-by-N matrix Q (usually the orthogonal matrix Q
> of Schur vectors returned by SHSEQR).
> On exit, if SIDE = 'L' or 'B', VL contains:
> if HOWMNY = 'A', the matrix Y of left eigenvectors of T;
> if HOWMNY = 'B', the matrix Q\*Y;
> if HOWMNY = 'S', the left eigenvectors of T specified by
> SELECT, stored consecutively in the columns
> of VL, in the same order as their
> eigenvalues.
> A complex eigenvector corresponding to a complex eigenvalue
> is stored in two consecutive columns, the first holding the
> real part, and the second the imaginary part.
> Not referenced if SIDE = 'R'.

LDVL : INTEGER [in]
> The leading dimension of the array VL.
> LDVL >= 1, and if SIDE = 'L' or 'B', LDVL >= N.

VR : REAL array, dimension (LDVR,MM) [in,out]
> On entry, if SIDE = 'R' or 'B' and HOWMNY = 'B', VR must
> contain an N-by-N matrix Q (usually the orthogonal matrix Q
> of Schur vectors returned by SHSEQR).
> On exit, if SIDE = 'R' or 'B', VR contains:
> if HOWMNY = 'A', the matrix X of right eigenvectors of T;
> if HOWMNY = 'B', the matrix Q\*X;
> if HOWMNY = 'S', the right eigenvectors of T specified by
> SELECT, stored consecutively in the columns
> of VR, in the same order as their
> eigenvalues.
> A complex eigenvector corresponding to a complex eigenvalue
> is stored in two consecutive columns, the first holding the
> real part and the second the imaginary part.
> Not referenced if SIDE = 'L'.

LDVR : INTEGER [in]
> The leading dimension of the array VR.
> LDVR >= 1, and if SIDE = 'R' or 'B', LDVR >= N.

MM : INTEGER [in]
> The number of columns in the arrays VL and/or VR. MM >= M.

M : INTEGER [out]
> The number of columns in the arrays VL and/or VR actually
> used to store the eigenvectors.
> If HOWMNY = 'A' or 'B', M is set to N.
> Each selected real eigenvector occupies one column and each
> selected complex eigenvector occupies two columns.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]

LWORK : INTEGER [in]
> The dimension of array WORK. LWORK >= max(1,3\*N).
> For optimum performance, LWORK >= N + 2\*N\*NB, where NB is
> the optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
