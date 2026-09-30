```fortran
subroutine sorcsd2by1 (
        character jobu1,
        character jobu2,
        character jobv1t,
        integer m,
        integer p,
        integer q,
        real, dimension(ldx11,*) x11,
        integer ldx11,
        real, dimension(ldx21,*) x21,
        integer ldx21,
        real, dimension(*) theta,
        real, dimension(ldu1,*) u1,
        integer ldu1,
        real, dimension(ldu2,*) u2,
        integer ldu2,
        real, dimension(ldv1t,*) v1t,
        integer ldv1t,
        real, dimension(*) work,
        integer lwork,
        integer, dimension(*) iwork,
        integer info
)
```

SORCSD2BY1 computes the CS decomposition of an M-by-Q matrix X with
orthonormal columns that has been partitioned into a 2-by-1 block
structure:

[  I1 0  0 ]
[  0  C  0 ]
[ X11 ]   [ U1 |    ] [  0  0  0 ]
X = [-----] = [---------] [----------] V1\*\*T .
[ X21 ]   [    | U2 ] [  0  0  0 ]
[  0  S  0 ]
[  0  0  I2]

X11 is P-by-Q. The orthogonal matrices U1, U2, and V1 are P-by-P,
(M-P)-by-(M-P), and Q-by-Q, respectively. C and S are R-by-R
nonnegative diagonal matrices satisfying C^2 + S^2 = I, in which
R = MIN(P,M-P,Q,M-Q). I1 is a K1-by-K1 identity matrix and I2 is a
K2-by-K2 identity matrix, where K1 = MAX(Q+P-M,0), K2 = MAX(Q-P,0).

## Parameters
JOBU1 : CHARACTER [in]
> = 'Y':      U1 is computed;
> otherwise:  U1 is not computed.

JOBU2 : CHARACTER [in]
> = 'Y':      U2 is computed;
> otherwise:  U2 is not computed.

JOBV1T : CHARACTER [in]
> = 'Y':      V1T is computed;
> otherwise:  V1T is not computed.

M : INTEGER [in]
> The number of rows in X.

P : INTEGER [in]
> The number of rows in X11. 0 <= P <= M.

Q : INTEGER [in]
> The number of columns in X11 and X21. 0 <= Q <= M.

X11 : REAL array, dimension (LDX11,Q) [in,out]
> On entry, part of the orthogonal matrix whose CSD is desired.

LDX11 : INTEGER [in]
> The leading dimension of X11. LDX11 >= MAX(1,P).

X21 : REAL array, dimension (LDX21,Q) [in,out]
> On entry, part of the orthogonal matrix whose CSD is desired.

LDX21 : INTEGER [in]
> The leading dimension of X21. LDX21 >= MAX(1,M-P).

THETA : REAL array, dimension (R), in which R = [out]
> MIN(P,M-P,Q,M-Q).
> C = DIAG( COS(THETA(1)), ... , COS(THETA(R)) ) and
> S = DIAG( SIN(THETA(1)), ... , SIN(THETA(R)) ).

U1 : REAL array, dimension (P) [out]
> If JOBU1 = 'Y', U1 contains the P-by-P orthogonal matrix U1.

LDU1 : INTEGER [in]
> The leading dimension of U1. If JOBU1 = 'Y', LDU1 >=
> MAX(1,P).

U2 : REAL array, dimension (M-P) [out]
> If JOBU2 = 'Y', U2 contains the (M-P)-by-(M-P) orthogonal
> matrix U2.

LDU2 : INTEGER [in]
> The leading dimension of U2. If JOBU2 = 'Y', LDU2 >=
> MAX(1,M-P).

V1T : REAL array, dimension (Q) [out]
> If JOBV1T = 'Y', V1T contains the Q-by-Q matrix orthogonal
> matrix V1\*\*T.

LDV1T : INTEGER [in]
> The leading dimension of V1T. If JOBV1T = 'Y', LDV1T >=
> MAX(1,Q).

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.
> If INFO > 0 on exit, WORK(2:R) contains the values PHI(1),
> ..., PHI(R-1) that, together with THETA(1), ..., THETA(R),
> define the matrix in intermediate bidiagonal-block form
> remaining after nonconvergence. INFO specifies the number
> of nonzero PHI's.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the work array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (M-MIN(P,M-P,Q,M-Q)) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  SBBCSD did not converge. See the description of WORK
> above for details.
