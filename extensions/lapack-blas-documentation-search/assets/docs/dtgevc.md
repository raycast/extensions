```fortran
subroutine dtgevc (
        character side,
        character howmny,
        logical, dimension( * ) select,
        integer n,
        double precision, dimension( lds, * ) s,
        integer lds,
        double precision, dimension( ldp, * ) p,
        integer ldp,
        double precision, dimension( ldvl, * ) vl,
        integer ldvl,
        double precision, dimension( ldvr, * ) vr,
        integer ldvr,
        integer mm,
        integer m,
        double precision, dimension( * ) work,
        integer info
)
```

DTGEVC computes some or all of the right and/or left eigenvectors of
a pair of real matrices (S,P), where S is a quasi-triangular matrix
and P is upper triangular.  Matrix pairs of this type are produced by
the generalized Schur factorization of a matrix pair (A,B):

A = Q\*S\*Z\*\*T,  B = Q\*P\*Z\*\*T

as computed by DGGHRD + DHGEQZ.

The right eigenvector x and the left eigenvector y of (S,P)
corresponding to an eigenvalue w are defined by:

S\*x = w\*P\*x,  (y\*\*H)\*S = w\*(y\*\*H)\*P,

where y\*\*H denotes the conjugate transpose of y.
The eigenvalues are not input to this routine, but are computed
directly from the diagonal blocks of S and P.

This routine returns the matrices X and/or Y of right and left
eigenvectors of (S,P), or the products Z\*X and/or Q\*Y,
where Z and Q are input matrices.
If Q and Z are the orthogonal factors from the generalized Schur
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
> computed.  If w(j) is a real eigenvalue, the corresponding
> real eigenvector is computed if SELECT(j) is .TRUE..
> If w(j) and w(j+1) are the real and imaginary parts of a
> complex eigenvalue, the corresponding complex eigenvector
> is computed if either SELECT(j) or SELECT(j+1) is .TRUE.,
> and on exit SELECT(j) is set to .TRUE. and SELECT(j+1) is
> set to .FALSE..
> Not referenced if HOWMNY = 'A' or 'B'.

N : INTEGER [in]
> The order of the matrices S and P.  N >= 0.

S : DOUBLE PRECISION array, dimension (LDS,N) [in]
> The upper quasi-triangular matrix S from a generalized Schur
> factorization, as computed by DHGEQZ.

LDS : INTEGER [in]
> The leading dimension of array S.  LDS >= max(1,N).

P : DOUBLE PRECISION array, dimension (LDP,N) [in]
> The upper triangular matrix P from a generalized Schur
> factorization, as computed by DHGEQZ.
> 2-by-2 diagonal blocks of P corresponding to 2-by-2 blocks
> of S must be in positive diagonal form.

LDP : INTEGER [in]
> The leading dimension of array P.  LDP >= max(1,N).

VL : DOUBLE PRECISION array, dimension (LDVL,MM) [in,out]
> On entry, if SIDE = 'L' or 'B' and HOWMNY = 'B', VL must
> contain an N-by-N matrix Q (usually the orthogonal matrix Q
> of left Schur vectors returned by DHGEQZ).
> On exit, if SIDE = 'L' or 'B', VL contains:
> if HOWMNY = 'A', the matrix Y of left eigenvectors of (S,P);
> if HOWMNY = 'B', the matrix Q\*Y;
> if HOWMNY = 'S', the left eigenvectors of (S,P) specified by
> SELECT, stored consecutively in the columns of
> VL, in the same order as their eigenvalues.
> 
> A complex eigenvector corresponding to a complex eigenvalue
> is stored in two consecutive columns, the first holding the
> real part, and the second the imaginary part.
> 
> Not referenced if SIDE = 'R'.

LDVL : INTEGER [in]
> The leading dimension of array VL.  LDVL >= 1, and if
> SIDE = 'L' or 'B', LDVL >= N.

VR : DOUBLE PRECISION array, dimension (LDVR,MM) [in,out]
> On entry, if SIDE = 'R' or 'B' and HOWMNY = 'B', VR must
> contain an N-by-N matrix Z (usually the orthogonal matrix Z
> of right Schur vectors returned by DHGEQZ).
> 
> On exit, if SIDE = 'R' or 'B', VR contains:
> if HOWMNY = 'A', the matrix X of right eigenvectors of (S,P);
> if HOWMNY = 'B' or 'b', the matrix Z\*X;
> if HOWMNY = 'S' or 's', the right eigenvectors of (S,P)
> specified by SELECT, stored consecutively in the
> columns of VR, in the same order as their
> eigenvalues.
> 
> A complex eigenvector corresponding to a complex eigenvalue
> is stored in two consecutive columns, the first holding the
> real part and the second the imaginary part.
> 
> Not referenced if SIDE = 'L'.

LDVR : INTEGER [in]
> The leading dimension of the array VR.  LDVR >= 1, and if
> SIDE = 'R' or 'B', LDVR >= N.

MM : INTEGER [in]
> The number of columns in the arrays VL and/or VR. MM >= M.

M : INTEGER [out]
> The number of columns in the arrays VL and/or VR actually
> used to store the eigenvectors.  If HOWMNY = 'A' or 'B', M
> is set to N.  Each selected real eigenvector occupies one
> column and each selected complex eigenvector occupies two
> columns.

WORK : DOUBLE PRECISION array, dimension (6\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  the 2-by-2 block (INFO:INFO+1) does not have a complex
> eigenvalue.
