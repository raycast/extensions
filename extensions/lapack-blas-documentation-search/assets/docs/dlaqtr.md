```fortran
subroutine dlaqtr (
        logical ltran,
        logical lreal,
        integer n,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        double precision, dimension( * ) b,
        double precision w,
        double precision scale,
        double precision, dimension( * ) x,
        double precision, dimension( * ) work,
        integer info
)
```

DLAQTR solves the real quasi-triangular system

op(T)\*p = scale\*c,               if LREAL = .TRUE.

or the complex quasi-triangular systems

op(T + iB)\*(p+iq) = scale\*(c+id),  if LREAL = .FALSE.

in real arithmetic, where T is upper quasi-triangular.
If LREAL = .FALSE., then the first diagonal block of T must be
1 by 1, B is the specially structured matrix

B = [ b(1) b(2) ... b(n) ]
[       w            ]
[           w        ]
[              .     ]
[                 w  ]

op(A) = A or A\*\*T, A\*\*T denotes the transpose of
matrix A.

On input, X = [ c ].  On output, X = [ p ].
[ d ]                  [ q ]

This subroutine is designed for the condition number estimation
in routine DTRSNA.

## Parameters
LTRAN : LOGICAL [in]
> On entry, LTRAN specifies the option of conjugate transpose:
> = .FALSE.,    op(T+i\*B) = T+i\*B,
> = .TRUE.,     op(T+i\*B) = (T+i\*B)\*\*T.

LREAL : LOGICAL [in]
> On entry, LREAL specifies the input matrix structure:
> = .FALSE.,    the input is complex
> = .TRUE.,     the input is real

N : INTEGER [in]
> On entry, N specifies the order of T+i\*B. N >= 0.

T : DOUBLE PRECISION array, dimension (LDT,N) [in]
> On entry, T contains a matrix in Schur canonical form.
> If LREAL = .FALSE., then the first diagonal block of T mu
> be 1 by 1.

LDT : INTEGER [in]
> The leading dimension of the matrix T. LDT >= max(1,N).

B : DOUBLE PRECISION array, dimension (N) [in]
> On entry, B contains the elements to form the matrix
> B as described above.
> If LREAL = .TRUE., B is not referenced.

W : DOUBLE PRECISION [in]
> On entry, W is the diagonal element of the matrix B.
> If LREAL = .TRUE., W is not referenced.

SCALE : DOUBLE PRECISION [out]
> On exit, SCALE is the scale factor.

X : DOUBLE PRECISION array, dimension (2\*N) [in,out]
> On entry, X contains the right hand side of the system.
> On exit, X is overwritten by the solution.

WORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> On exit, INFO is set to
> 0: successful exit.
> 1: the some diagonal 1 by 1 block has been perturbed by
> a small number SMIN to keep nonsingularity.
> 2: the some diagonal 2 by 2 block has been perturbed by
> a small number in DLALN2 to keep nonsingularity.
> NOTE: In the interests of speed, this routine does not
> check the inputs for errors.
