```fortran
subroutine cunbdb2 (
        integer m,
        integer p,
        integer q,
        complex, dimension(ldx11,*) x11,
        integer ldx11,
        complex, dimension(ldx21,*) x21,
        integer ldx21,
        real, dimension(*) theta,
        real, dimension(*) phi,
        complex, dimension(*) taup1,
        complex, dimension(*) taup2,
        complex, dimension(*) tauq1,
        complex, dimension(*) work,
        integer lwork,
        integer info
)
```

CUNBDB2 simultaneously bidiagonalizes the blocks of a tall and skinny
matrix X with orthonormal columns:

[ B11 ]
[ X11 ]   [ P1 |    ] [  0  ]
[-----] = [---------] [-----] Q1\*\*T .
[ X21 ]   [    | P2 ] [ B21 ]
[  0  ]

X11 is P-by-Q, and X21 is (M-P)-by-Q. P must be no larger than M-P,
Q, or M-Q. Routines CUNBDB1, CUNBDB3, and CUNBDB4 handle cases in
which P is not the minimum dimension.

The unitary matrices P1, P2, and Q1 are P-by-P, (M-P)-by-(M-P),
and (M-Q)-by-(M-Q), respectively. They are represented implicitly by
Householder vectors.

B11 and B12 are P-by-P bidiagonal matrices represented implicitly by
angles THETA, PHI.

## Parameters
M : INTEGER [in]
> The number of rows X11 plus the number of rows in X21.

P : INTEGER [in]
> The number of rows in X11. 0 <= P <= min(M-P,Q,M-Q).

Q : INTEGER [in]
> The number of columns in X11 and X21. 0 <= Q <= M.

X11 : COMPLEX array, dimension (LDX11,Q) [in,out]
> On entry, the top block of the matrix X to be reduced. On
> exit, the columns of tril(X11) specify reflectors for P1 and
> the rows of triu(X11,1) specify reflectors for Q1.

LDX11 : INTEGER [in]
> The leading dimension of X11. LDX11 >= P.

X21 : COMPLEX array, dimension (LDX21,Q) [in,out]
> On entry, the bottom block of the matrix X to be reduced. On
> exit, the columns of tril(X21) specify reflectors for P2.

LDX21 : INTEGER [in]
> The leading dimension of X21. LDX21 >= M-P.

THETA : REAL array, dimension (Q) [out]
> The entries of the bidiagonal blocks B11, B21 are defined by
> THETA and PHI. See Further Details.

PHI : REAL array, dimension (Q-1) [out]
> The entries of the bidiagonal blocks B11, B21 are defined by
> THETA and PHI. See Further Details.

TAUP1 : COMPLEX array, dimension (P-1) [out]
> The scalar factors of the elementary reflectors that define
> P1.

TAUP2 : COMPLEX array, dimension (Q) [out]
> The scalar factors of the elementary reflectors that define
> P2.

TAUQ1 : COMPLEX array, dimension (Q) [out]
> The scalar factors of the elementary reflectors that define
> Q1.

WORK : COMPLEX array, dimension (LWORK) [out]

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
