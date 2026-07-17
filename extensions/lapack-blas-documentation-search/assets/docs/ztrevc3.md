```fortran
subroutine ztrevc3 (
        character side,
        character howmny,
        logical, dimension( * ) select,
        integer n,
        complex*16, dimension( ldt, * ) t,
        integer ldt,
        complex*16, dimension( ldvl, * ) vl,
        integer ldvl,
        complex*16, dimension( ldvr, * ) vr,
        integer ldvr,
        integer mm,
        integer m,
        complex*16, dimension( * ) work,
        integer lwork,
        double precision, dimension( * ) rwork,
        integer lrwork,
        integer info
)
```

ZTREVC3 computes some or all of the right and/or left eigenvectors of
a complex upper triangular matrix T.
Matrices of this type are produced by the Schur factorization of
a complex general matrix:  A = Q\*T\*Q\*\*H, as computed by ZHSEQR.

The right eigenvector x and the left eigenvector y of T corresponding
to an eigenvalue w are defined by:

T\*x = w\*x,     (y\*\*H)\*T = w\*(y\*\*H)

where y\*\*H denotes the conjugate transpose of the vector y.
The eigenvalues are not input to this routine, but are read directly
from the diagonal of T.

This routine returns the matrices X and/or Y of right and left
eigenvectors of T, or the products Q\*X and/or Q\*Y, where Q is an
input matrix. If Q is the unitary factor that reduces a matrix A to
Schur form T, then Q\*X and Q\*Y are the matrices of right and left
eigenvectors of A.

This uses a Level 3 BLAS version of the back transformation.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'R':  compute right eigenvectors only;
> = 'L':  compute left eigenvectors only;
> = 'B':  compute both right and left eigenvectors.

HOWMNY : CHARACTER\*1 [in]
> = 'A':  compute all right and/or left eigenvectors;
> = 'B':  compute all right and/or left eigenvectors,
> backtransformed using the matrices supplied in
> VR and/or VL;
> = 'S':  compute selected right and/or left eigenvectors,
> as indicated by the logical array SELECT.

SELECT : LOGICAL array, dimension (N) [in]
> If HOWMNY = 'S', SELECT specifies the eigenvectors to be
> computed.
> The eigenvector corresponding to the j-th eigenvalue is
> computed if SELECT(j) = .TRUE..
> Not referenced if HOWMNY = 'A' or 'B'.

N : INTEGER [in]
> The order of the matrix T. N >= 0.

T : COMPLEX\*16 array, dimension (LDT,N) [in,out]
> The upper triangular matrix T.  T is modified, but restored
> on exit.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

VL : COMPLEX\*16 array, dimension (LDVL,MM) [in,out]
> On entry, if SIDE = 'L' or 'B' and HOWMNY = 'B', VL must
> contain an N-by-N matrix Q (usually the unitary matrix Q of
> Schur vectors returned by ZHSEQR).
> On exit, if SIDE = 'L' or 'B', VL contains:
> if HOWMNY = 'A', the matrix Y of left eigenvectors of T;
> if HOWMNY = 'B', the matrix Q\*Y;
> if HOWMNY = 'S', the left eigenvectors of T specified by
> SELECT, stored consecutively in the columns
> of VL, in the same order as their
> eigenvalues.
> Not referenced if SIDE = 'R'.

LDVL : INTEGER [in]
> The leading dimension of the array VL.
> LDVL >= 1, and if SIDE = 'L' or 'B', LDVL >= N.

VR : COMPLEX\*16 array, dimension (LDVR,MM) [in,out]
> On entry, if SIDE = 'R' or 'B' and HOWMNY = 'B', VR must
> contain an N-by-N matrix Q (usually the unitary matrix Q of
> Schur vectors returned by ZHSEQR).
> On exit, if SIDE = 'R' or 'B', VR contains:
> if HOWMNY = 'A', the matrix X of right eigenvectors of T;
> if HOWMNY = 'B', the matrix Q\*X;
> if HOWMNY = 'S', the right eigenvectors of T specified by
> SELECT, stored consecutively in the columns
> of VR, in the same order as their
> eigenvalues.
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
> Each selected eigenvector occupies one column.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]

LWORK : INTEGER [in]
> The dimension of array WORK. LWORK >= max(1,2\*N).
> For optimum performance, LWORK >= N + 2\*N\*NB, where NB is
> the optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

RWORK : DOUBLE PRECISION array, dimension (LRWORK) [out]

LRWORK : INTEGER [in]
> The dimension of array RWORK. LRWORK >= max(1,N).
> 
> If LRWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the RWORK array, returns
> this value as the first entry of the RWORK array, and no error
> message related to LRWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
