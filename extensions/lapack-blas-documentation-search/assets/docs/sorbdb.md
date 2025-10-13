```fortran
subroutine sorbdb (
        character trans,
        character signs,
        integer m,
        integer p,
        integer q,
        real, dimension( ldx11, * ) x11,
        integer ldx11,
        real, dimension( ldx12, * ) x12,
        integer ldx12,
        real, dimension( ldx21, * ) x21,
        integer ldx21,
        real, dimension( ldx22, * ) x22,
        integer ldx22,
        real, dimension( * ) theta,
        real, dimension( * ) phi,
        real, dimension( * ) taup1,
        real, dimension( * ) taup2,
        real, dimension( * ) tauq1,
        real, dimension( * ) tauq2,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SORBDB simultaneously bidiagonalizes the blocks of an M-by-M
partitioned orthogonal matrix X:

[ B11 | B12 0  0 ]
[ X11 | X12 ]   [ P1 |    ] [  0  |  0 -I  0 ] [ Q1 |    ]\*\*T
X = [-----------] = [---------] [----------------] [---------]   .
[ X21 | X22 ]   [    | P2 ] [ B21 | B22 0  0 ] [    | Q2 ]
[  0  |  0  0  I ]

X11 is P-by-Q. Q must be no larger than P, M-P, or M-Q. (If this is
not the case, then X must be transposed and/or permuted. This can be
done in constant time using the TRANS and SIGNS options. See SORCSD
for details.)

The orthogonal matrices P1, P2, Q1, and Q2 are P-by-P, (M-P)-by-
(M-P), Q-by-Q, and (M-Q)-by-(M-Q), respectively. They are
represented implicitly by Householder vectors.

B11, B12, B21, and B22 are Q-by-Q bidiagonal matrices represented
implicitly by angles THETA, PHI.

## Parameters
TRANS : CHARACTER [in]
> = 'T':      X, U1, U2, V1T, and V2T are stored in row-major
> order;
> otherwise:  X, U1, U2, V1T, and V2T are stored in column-
> major order.

SIGNS : CHARACTER [in]
> = 'O':      The lower-left block is made nonpositive (the
> convention);
> otherwise:  The upper-right block is made nonpositive (the
> convention).

M : INTEGER [in]
> The number of rows and columns in X.

P : INTEGER [in]
> The number of rows in X11 and X12. 0 <= P <= M.

Q : INTEGER [in]
> The number of columns in X11 and X21. 0 <= Q <=
> MIN(P,M-P,M-Q).

X11 : REAL array, dimension (LDX11,Q) [in,out]
> On entry, the top-left block of the orthogonal matrix to be
> reduced. On exit, the form depends on TRANS:
> If TRANS = 'N', then
> the columns of tril(X11) specify reflectors for P1,
> the rows of triu(X11,1) specify reflectors for Q1;
> else TRANS = 'T', and
> the rows of triu(X11) specify reflectors for P1,
> the columns of tril(X11,-1) specify reflectors for Q1.

LDX11 : INTEGER [in]
> The leading dimension of X11. If TRANS = 'N', then LDX11 >=
> P; else LDX11 >= Q.

X12 : REAL array, dimension (LDX12,M-Q) [in,out]
> On entry, the top-right block of the orthogonal matrix to
> be reduced. On exit, the form depends on TRANS:
> If TRANS = 'N', then
> the rows of triu(X12) specify the first P reflectors for
> Q2;
> else TRANS = 'T', and
> the columns of tril(X12) specify the first P reflectors
> for Q2.

LDX12 : INTEGER [in]
> The leading dimension of X12. If TRANS = 'N', then LDX12 >=
> P; else LDX11 >= M-Q.

X21 : REAL array, dimension (LDX21,Q) [in,out]
> On entry, the bottom-left block of the orthogonal matrix to
> be reduced. On exit, the form depends on TRANS:
> If TRANS = 'N', then
> the columns of tril(X21) specify reflectors for P2;
> else TRANS = 'T', and
> the rows of triu(X21) specify reflectors for P2.

LDX21 : INTEGER [in]
> The leading dimension of X21. If TRANS = 'N', then LDX21 >=
> M-P; else LDX21 >= Q.

X22 : REAL array, dimension (LDX22,M-Q) [in,out]
> On entry, the bottom-right block of the orthogonal matrix to
> be reduced. On exit, the form depends on TRANS:
> If TRANS = 'N', then
> the rows of triu(X22(Q+1:M-P,P+1:M-Q)) specify the last
> M-P-Q reflectors for Q2,
> else TRANS = 'T', and
> the columns of tril(X22(P+1:M-Q,Q+1:M-P)) specify the last
> M-P-Q reflectors for P2.

LDX22 : INTEGER [in]
> The leading dimension of X22. If TRANS = 'N', then LDX22 >=
> M-P; else LDX22 >= M-Q.

THETA : REAL array, dimension (Q) [out]
> The entries of the bidiagonal blocks B11, B12, B21, B22 can
> be computed from the angles THETA and PHI. See Further
> Details.

PHI : REAL array, dimension (Q-1) [out]
> The entries of the bidiagonal blocks B11, B12, B21, B22 can
> be computed from the angles THETA and PHI. See Further
> Details.

TAUP1 : REAL array, dimension (P) [out]
> The scalar factors of the elementary reflectors that define
> P1.

TAUP2 : REAL array, dimension (M-P) [out]
> The scalar factors of the elementary reflectors that define
> P2.

TAUQ1 : REAL array, dimension (Q) [out]
> The scalar factors of the elementary reflectors that define
> Q1.

TAUQ2 : REAL array, dimension (M-Q) [out]
> The scalar factors of the elementary reflectors that define
> Q2.

WORK : REAL array, dimension (LWORK) [out]

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= M-Q.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
