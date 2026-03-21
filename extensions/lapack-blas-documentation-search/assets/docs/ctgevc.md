```fortran
subroutine ctgevc (
        character side,
        character howmny,
        logical, dimension( * ) select,
        integer n,
        complex, dimension( lds, * ) s,
        integer lds,
        complex, dimension( ldp, * ) p,
        integer ldp,
        complex, dimension( ldvl, * ) vl,
        integer ldvl,
        complex, dimension( ldvr, * ) vr,
        integer ldvr,
        integer mm,
        integer m,
        complex, dimension( * ) work,
        real, dimension( * ) rwork,
        integer info
)
```

CTGEVC computes some or all of the right and/or left eigenvectors of
a pair of complex matrices (S,P), where S and P are upper triangular.
Matrix pairs of this type are produced by the generalized Schur
factorization of a complex matrix pair (A,B):

A = Q\*S\*Z\*\*H,  B = Q\*P\*Z\*\*H

as computed by CGGHRD + CHGEQZ.

The right eigenvector x and the left eigenvector y of (S,P)
corresponding to an eigenvalue w are defined by:

S\*x = w\*P\*x,  (y\*\*H)\*S = w\*(y\*\*H)\*P,

where y\*\*H denotes the conjugate transpose of y.
The eigenvalues are not input to this routine, but are computed
directly from the diagonal elements of S and P.

This routine returns the matrices X and/or Y of right and left
eigenvectors of (S,P), or the products Z\*X and/or Q\*Y,
where Z and Q are input matrices.
If Q and Z are the unitary factors from the generalized Schur
factorization of a matrix pair (A,B), then Z\*X and Q\*Y
are the matrices of right and left eigenvectors of (A,B).

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'R': compute right eigenvectors only;
> = 'L': compute left eigenvectors only;
> = 'B': compute both right and left eigenvectors.

HOWMNY : CHARACTER\*1 [in]
> = 'A': compute all right and/or left eigenvectors;
> = 'B': compute all right and/or left eigenvectors,
> backtransformed by the matrices in VR and/or VL;
> = 'S': compute selected right and/or left eigenvectors,
> specified by the logical array SELECT.

SELECT : LOGICAL array, dimension (N) [in]
> If HOWMNY='S', SELECT specifies the eigenvectors to be
> computed.  The eigenvector corresponding to the j-th
> eigenvalue is computed if SELECT(j) = .TRUE..
> Not referenced if HOWMNY = 'A' or 'B'.

N : INTEGER [in]
> The order of the matrices S and P.  N >= 0.

S : COMPLEX array, dimension (LDS,N) [in]
> The upper triangular matrix S from a generalized Schur
> factorization, as computed by CHGEQZ.

LDS : INTEGER [in]
> The leading dimension of array S.  LDS >= max(1,N).

P : COMPLEX array, dimension (LDP,N) [in]
> The upper triangular matrix P from a generalized Schur
> factorization, as computed by CHGEQZ.  P must have real
> diagonal elements.

LDP : INTEGER [in]
> The leading dimension of array P.  LDP >= max(1,N).

VL : COMPLEX array, dimension (LDVL,MM) [in,out]
> On entry, if SIDE = 'L' or 'B' and HOWMNY = 'B', VL must
> contain an N-by-N matrix Q (usually the unitary matrix Q
> of left Schur vectors returned by CHGEQZ).
> On exit, if SIDE = 'L' or 'B', VL contains:
> if HOWMNY = 'A', the matrix Y of left eigenvectors of (S,P);
> if HOWMNY = 'B', the matrix Q\*Y;
> if HOWMNY = 'S', the left eigenvectors of (S,P) specified by
> SELECT, stored consecutively in the columns of
> VL, in the same order as their eigenvalues.
> Not referenced if SIDE = 'R'.

LDVL : INTEGER [in]
> The leading dimension of array VL.  LDVL >= 1, and if
> SIDE = 'L' or 'l' or 'B' or 'b', LDVL >= N.

VR : COMPLEX array, dimension (LDVR,MM) [in,out]
> On entry, if SIDE = 'R' or 'B' and HOWMNY = 'B', VR must
> contain an N-by-N matrix Z (usually the unitary matrix Z
> of right Schur vectors returned by CHGEQZ).
> On exit, if SIDE = 'R' or 'B', VR contains:
> if HOWMNY = 'A', the matrix X of right eigenvectors of (S,P);
> if HOWMNY = 'B', the matrix Z\*X;
> if HOWMNY = 'S', the right eigenvectors of (S,P) specified by
> SELECT, stored consecutively in the columns of
> VR, in the same order as their eigenvalues.
> Not referenced if SIDE = 'L'.

LDVR : INTEGER [in]
> The leading dimension of the array VR.  LDVR >= 1, and if
> SIDE = 'R' or 'B', LDVR >= N.

MM : INTEGER [in]
> The number of columns in the arrays VL and/or VR. MM >= M.

M : INTEGER [out]
> The number of columns in the arrays VL and/or VR actually
> used to store the eigenvectors.  If HOWMNY = 'A' or 'B', M
> is set to N.  Each selected eigenvector occupies one column.

WORK : COMPLEX array, dimension (2\*N) [out]

RWORK : REAL array, dimension (2\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
